import { Injectable } from '@nestjs/common';
import { dateValue } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { AiPool } from '../entitlements.types.js';

type Db = PrismaClient | Prisma.TransactionClient;
type Cycle = { start: Date; end: Date };

const AI_POOLS: AiPool[] = ['ai_practice', 'ai_lookup'];

/** Counts over the ledger (design §7.2, §7.3). No counter table (D28): every number is counted from rows. Pass `tx` under a lock. */
@Injectable()
export class UsageQueries {
  /** Confirmed uses in the cycle + unexpired reservations − credits in the cycle, never below 0. */
  async aiUsed(db: Db, userId: string, pool: AiPool, cycle: Cycle, now: Date): Promise<number> {
    const confirmed = await this.confirmedInCycle(db, userId, pool, cycle);
    const reserved = await db.usageRecord.count({
      where: { userId, pool, kind: 'use', status: 'reserved', expiresAt: { gt: now } },
    });
    const credits = await this.creditsInCycle(db, userId, pool, cycle);
    return Math.max(0, confirmed + reserved - credits);
  }

  async confirmedInCycle(db: Db, userId: string, pool: AiPool, cycle: Cycle): Promise<number> {
    return db.usageRecord.count({
      where: { userId, pool, kind: 'use', status: 'confirmed', confirmedAt: { gte: cycle.start, lt: cycle.end } },
    });
  }

  async creditsInCycle(db: Db, userId: string, pool: AiPool, cycle: Cycle): Promise<number> {
    return db.usageRecord.count({ where: { userId, pool, kind: 'credit', creditedAt: { gte: cycle.start, lt: cycle.end } } });
  }

  /** Sessions recorded on the learner's `localDate` (`YYYY-MM-DD`). */
  async practiceUsed(db: Db, userId: string, localDate: string): Promise<number> {
    return db.usageRecord.count({
      where: { userId, pool: 'practice_sessions', kind: 'use', status: 'confirmed', localDate: dateValue(localDate) },
    });
  }

  /** Both AI pools on the cap's `day`: confirmed uses, and reservations not yet expired. */
  async capUsed(db: Db, day: string, now: Date): Promise<{ confirmed: number; reserved: number }> {
    const systemDate = dateValue(day);
    const confirmed = await db.usageRecord.count({
      where: { pool: { in: AI_POOLS }, kind: 'use', status: 'confirmed', systemDate },
    });
    const reserved = await db.usageRecord.count({
      where: { pool: { in: AI_POOLS }, kind: 'use', status: 'reserved', systemDate, expiresAt: { gt: now } },
    });
    return { confirmed, reserved };
  }
}
