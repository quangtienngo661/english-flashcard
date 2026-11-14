import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { getOperationId, runWithOperationId } from '../../common/logging/request-context.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { dedupeKey, type ParsedEvent } from './billing-adapter.js';
import { eventKind } from './billing.types.js';

/** Applies stored events after the webhook answered (design §9.2 step 4); bound to the applier by Task 17. */
export type BillingApplyPort = { applyMany(ids: string[]): Promise<void> };
export const BILLING_APPLY_PORT = 'BILLING_APPLY_PORT';
export const NOOP_APPLY_PORT: BillingApplyPort = { applyMany: async () => {} };

/**
 * The event inbox (design §9.2 steps 2–4): stores each signed event once by `dedupe_key`, then hands the new rows to the
 * applier once the response has closed, so the provider's ack never waits for it. Rows left `pending` by a crash are
 * retried by the hourly job.
 */
@Injectable()
export class BillingInbox implements OnApplicationShutdown {
  private readonly running = new Set<Promise<void>>();

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(BILLING_APPLY_PORT) private readonly port: BillingApplyPort,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** One insert, `ON CONFLICT DO NOTHING`; returns the ids of new rows only (a duplicate is "already received"). */
  async store(provider: string, events: ParsedEvent[]): Promise<string[]> {
    if (events.length === 0) return [];
    const receivedAt = this.clock.now();
    const rows = await this.prisma.billingEvent.createManyAndReturn({
      data: events.map((event) => ({
        provider,
        environment: event.environment,
        dedupeKey: dedupeKey(provider, event.environment, event.externalEventId),
        externalEventId: event.externalEventId,
        externalSubscriptionId: event.externalSubscriptionId,
        type: event.type,
        kind: eventKind(event.type),
        transactionId: event.transactionId,
        occurredAt: event.occurredAt,
        receivedAt,
        appUserId: event.appUserId,
        // NULL (not JSON null) marks missing §9.3 fields for the applier.
        payload: event.event === null ? Prisma.DbNull : (JSON.parse(JSON.stringify(event.event)) as Prisma.InputJsonObject),
        rawPayload: event.raw as Prisma.InputJsonValue,
        status: 'pending',
      })),
      skipDuplicates: true,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  afterResponse(res: Response, ids: string[]): void {
    if (ids.length === 0) return;
    const operationId = getOperationId() ?? randomUUID();
    let resolve!: () => void;
    const settled = new Promise<void>((done) => { resolve = done; });
    this.running.add(settled);
    const start = () => {
      runWithOperationId(operationId, () => this.port.applyMany(ids))
        .catch((err: unknown) => this.logger.error('billing_apply_failed', err, { count: ids.length }))
        .finally(() => {
          this.running.delete(settled);
          resolve();
        });
    };
    if (res.closed) start();
    else res.once('close', start);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.drain();
  }

  async drain(): Promise<void> {
    while (this.running.size > 0) await Promise.all(this.running);
  }
}
