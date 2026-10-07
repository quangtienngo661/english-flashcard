import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import type { Prisma, PrismaClient, SessionChain } from '../../generated/prisma/client.js';
import type { ClientType } from '../identity.types.js';
import { withUserLock } from '../user-lock.js';
import { AccessTokenService } from './access-token.service.js';
import { open, seal } from './grace-cipher.js';
import { newRefreshToken } from './refresh-token.js';

const day = 86_400_000;
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  sessionChainId: string;
  client: ClientType;
  refreshExpiresAt: Date;
}

type SessionMaterial = Omit<IssuedSession, 'accessToken'>;
type RefreshOutcome =
  | { kind: 'rotated' | 'grace'; session: SessionMaterial }
  | { kind: 'rejected'; reason: 'expired' | 'reuse' | 'revoked' | 'path_mismatch' };

@Injectable()
export class SessionService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AccessTokenService) private readonly access: AccessTokenService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** The caller must already hold withUserLock(tx, input.userId). */
  async startChain(tx: Prisma.TransactionClient, input: {
    userId: string; client: ClientType; deviceLabel?: string;
  }): Promise<IssuedSession> {
    const now = this.clock.now();
    const chain = await tx.sessionChain.create({
      data: {
        userId: input.userId, clientType: input.client, deviceLabel: input.deviceLabel,
        createdAt: now, lastUsedAt: now,
      },
    });
    const fresh = newRefreshToken();
    await tx.refreshToken.create({ data: { chainId: chain.id, tokenHash: fresh.hash, createdAt: now } });

    // Preserve the newly issued chain even when several lastUsedAt timestamps tie. Only ACTIVE chains
    // (not revoked, inside the 90 d idle and 365 d absolute limits) count toward the cap; an expired
    // chain that was never refreshed again is dead already and must not cost a live one its slot.
    const older = await tx.sessionChain.findMany({
      where: {
        userId: input.userId, revokedAt: null, id: { not: chain.id },
        lastUsedAt: { gte: new Date(now.getTime() - 90 * day) },
        createdAt: { gte: new Date(now.getTime() - 365 * day) },
      },
      orderBy: [{ lastUsedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const victims = older.slice(0, Math.max(0, older.length - 9));
    if (victims.length > 0) {
      await tx.sessionChain.updateMany({
        where: { userId: input.userId, id: { in: victims.map((victim) => victim.id) }, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'device_cap' },
      });
    }
    return {
      ...this.material(chain, fresh.token, input.client, now),
      accessToken: await this.access.sign({ userId: input.userId, sessionChainId: chain.id }),
    };
  }

  async refresh(token: string, path: ClientType): Promise<IssuedSession> {
    // Only locate the lock owner here. All security decisions use fresh locked reads.
    // An unknown hash has no owner to lock and, by design, cannot revoke any chain.
    const located = await this.locate(token);
    if (!located) throw this.invalidToken();
    await this.limiter.hit('auth.refresh.chain', located.chainId);
    const outcome = await this.prisma.$transaction(async (tx): Promise<RefreshOutcome> => {
      await withUserLock(tx, located.chain.userId);
      return this.refreshLocked(tx, located.id, path);
    }, transactionOptions);

    // A denial must reach this point only after its revocation has committed.
    if (outcome.kind === 'rejected') {
      if (outcome.reason === 'reuse') {
        this.logger.warn('refresh_reuse_detected', { chain_id: located.chainId });
      }
      throw this.invalidToken();
    }
    if (outcome.kind === 'grace') {
      this.logger.info('refresh_grace_used', { chain_id: located.chainId });
    }
    return {
      ...outcome.session,
      accessToken: await this.access.sign({
        userId: located.chain.userId, sessionChainId: outcome.session.sessionChainId,
      }),
    };
  }

  async revokeByRefreshToken(token: string, path: ClientType): Promise<void> {
    const located = await this.locate(token);
    if (!located) return;
    await this.prisma.$transaction(async (tx) => {
      await withUserLock(tx, located.chain.userId);
      const row = await tx.refreshToken.findUnique({ where: { id: located.id }, include: { chain: true } });
      const now = this.clock.now();
      if (!row || row.rotatedAt || row.chain.revokedAt || row.chain.clientType !== path) return;
      await tx.sessionChain.updateMany({
        where: { id: row.chainId, revokedAt: null }, data: { revokedAt: now, revokeReason: 'logout' },
      });
    }, transactionOptions);
  }

  /** The caller must already hold withUserLock(tx, userId). */
  async revokeAllForUser(tx: Prisma.TransactionClient, userId: string, reason: string): Promise<void> {
    await tx.sessionChain.updateMany({
      where: { userId, revokedAt: null }, data: { revokedAt: this.clock.now(), revokeReason: reason },
    });
  }

  private locate(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
      select: { id: true, chainId: true, chain: { select: { userId: true } } },
    });
  }

  private async refreshLocked(tx: Prisma.TransactionClient, tokenId: string, path: ClientType): Promise<RefreshOutcome> {
    // A zero-count CAS gets one fresh decision, allowing the winner's grace path.
    // Two failed CAS attempts under the same advisory lock indicate an unexpected invariant violation.
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await tx.refreshToken.findUnique({ where: { id: tokenId }, include: { chain: true } });
      const successor = row?.successorId
        ? await tx.refreshToken.findUnique({ where: { id: row.successorId } }) : null;
      const now = this.clock.now();
      if (!row || row.chain.revokedAt) return { kind: 'rejected', reason: 'revoked' };
      const chain = row.chain;
      if (chain.clientType !== path) return { kind: 'rejected', reason: 'path_mismatch' };
      if (now.getTime() > chain.lastUsedAt.getTime() + 90 * day
        || now.getTime() > chain.createdAt.getTime() + 365 * day) {
        await tx.sessionChain.updateMany({
          where: { id: chain.id, revokedAt: null }, data: { revokedAt: now, revokeReason: 'expired' },
        });
        return { kind: 'rejected', reason: 'expired' };
      }
      if (row.rotatedAt) {
        if (row.graceUntil && now.getTime() <= row.graceUntil.getTime()
          && successor && successor.chainId === chain.id && !successor.rotatedAt && row.successorCiphertext) {
          return {
            kind: 'grace',
            session: this.material(chain, open(row.successorCiphertext, this.config.refreshGraceKey), path, now),
          };
        }
        await tx.sessionChain.updateMany({
          where: { id: chain.id, revokedAt: null }, data: { revokedAt: now, revokeReason: 'reuse_detected' },
        });
        return { kind: 'rejected', reason: 'reuse' };
      }

      const fresh = newRefreshToken();
      const successorId = randomUUID();
      const rotated = await tx.refreshToken.updateMany({
        where: { id: row.id, rotatedAt: null },
        data: {
          rotatedAt: now, successorId, successorCiphertext: seal(fresh.token, this.config.refreshGraceKey),
          graceUntil: new Date(now.getTime() + 10_000),
        },
      });
      if (rotated.count === 0) continue;
      await tx.refreshToken.create({
        data: { id: successorId, chainId: chain.id, tokenHash: fresh.hash, createdAt: now },
      });
      await tx.sessionChain.update({ where: { id: chain.id }, data: { lastUsedAt: now } });
      return { kind: 'rotated', session: this.material(chain, fresh.token, path, now) };
    }
    throw new Error('Refresh rotation compare-and-set failed under user lock');
  }

  private material(chain: SessionChain, refreshToken: string, client: ClientType, now: Date): SessionMaterial {
    return {
      refreshToken, sessionChainId: chain.id, client,
      refreshExpiresAt: new Date(Math.min(now.getTime() + 90 * day, chain.createdAt.getTime() + 365 * day)),
    };
  }

  private invalidToken(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
  }
}
