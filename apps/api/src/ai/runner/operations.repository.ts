import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { ExistingRow } from './run-rules.js';

export type OperationRow = ExistingRow & { id: string; result: unknown; meta: unknown };

type Claim = {
  userId: string; operationId: string; operation: string; fingerprint: string; attemptId: string; startedAt: Date; deadlineAt: Date;
};

type Done = { status: 'succeeded' | 'permanent_failure'; result: unknown; meta: unknown; finishedAt: Date; expiresAt: Date };

type Row = {
  id: string; status: ExistingRow['status']; fingerprint: string; attempt_id: string; deadline_at: Date; result: unknown;
  meta: unknown;
};

const json = (value: unknown): string | null => (value === null || value === undefined ? null : JSON.stringify(value));

/**
 * `ai_operations` (design §8.1–8.2). Every write that races another caller is one conditional statement on the shared client, so
 * no transaction is ever open while a provider is called (R9): the claim's `ON CONFLICT`, and `attempt_id` on every later write.
 */
@Injectable()
export class OperationsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** Deletes this id's expired row first, so a result older than 24 h is never replayed (plan choice 17, B6E24). */
  async find(userId: string, operationId: string, now: Date): Promise<OperationRow | null> {
    await this.prisma.$executeRaw`
      DELETE FROM ai_operations WHERE user_id = ${userId}::uuid AND operation_id = ${operationId} AND expires_at <= ${now}`;
    const [row] = await this.prisma.$queryRaw<Row[]>`
      SELECT id, status, fingerprint, attempt_id, deadline_at, result, meta FROM ai_operations
      WHERE user_id = ${userId}::uuid AND operation_id = ${operationId}`;
    return row ? {
      id: row.id, status: row.status, fingerprint: row.fingerprint, attemptId: row.attempt_id, deadlineAt: row.deadline_at,
      result: row.result, meta: row.meta,
    } : null;
  }

  /** The row's id, or null when another caller holds this id already (B6E78). */
  async claim(row: Claim): Promise<string | null> {
    const [claimed] = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO ai_operations (user_id, operation_id, operation, fingerprint, status, attempt_id, started_at, deadline_at, created_at)
      VALUES (${row.userId}::uuid, ${row.operationId}, ${row.operation}, ${row.fingerprint}, 'running', ${row.attemptId}::uuid,
        ${row.startedAt}, ${row.deadlineAt}, ${row.startedAt})
      ON CONFLICT (user_id, operation_id) DO NOTHING RETURNING id`;
    return claimed?.id ?? null;
  }

  /** Takes over an abandoned `running` row; false when another caller took it first (B6E79). */
  async reclaim(id: string, oldAttemptId: string, newAttemptId: string, startedAt: Date, deadlineAt: Date): Promise<boolean> {
    const count = await this.prisma.$executeRaw`
      UPDATE ai_operations SET attempt_id = ${newAttemptId}::uuid, started_at = ${startedAt}, deadline_at = ${deadlineAt}
      WHERE id = ${id}::uuid AND attempt_id = ${oldAttemptId}::uuid AND status = 'running'`;
    return count > 0;
  }

  /** False when another caller reclaimed the row meanwhile (B6E80). */
  async finish(id: string, attemptId: string, done: Done): Promise<boolean> {
    const count = await this.prisma.$executeRaw`
      UPDATE ai_operations SET status = ${done.status}, result = ${json(done.result)}::jsonb, meta = ${json(done.meta)}::jsonb,
        finished_at = ${done.finishedAt}, expires_at = ${done.expiresAt}
      WHERE id = ${id}::uuid AND attempt_id = ${attemptId}::uuid`;
    return count > 0;
  }

  /** Removes this attempt's row so the next call with the id runs again (SR8); false when another caller holds it. */
  async drop(id: string, attemptId: string): Promise<boolean> {
    const count = await this.prisma.$executeRaw`DELETE FROM ai_operations WHERE id = ${id}::uuid AND attempt_id = ${attemptId}::uuid`;
    return count > 0;
  }

  /** A `bad-input` found before any row existed (design §8.1 step 2); a row someone else wrote meanwhile wins. */
  async storeFinal(row: Claim & { result: unknown; finishedAt: Date; expiresAt: Date }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ai_operations (user_id, operation_id, operation, fingerprint, status, attempt_id, started_at, deadline_at, result,
        finished_at, expires_at, created_at)
      VALUES (${row.userId}::uuid, ${row.operationId}, ${row.operation}, ${row.fingerprint}, 'permanent_failure', ${row.attemptId}::uuid,
        ${row.startedAt}, ${row.deadlineAt}, ${json(row.result)}::jsonb, ${row.finishedAt}, ${row.expiresAt}, ${row.startedAt})
      ON CONFLICT (user_id, operation_id) DO NOTHING`;
  }
}
