import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import { BILLING_ADAPTER_TIMEOUT_MS, GRANT_START_SKEW_MS } from '../entitlements.constants.js';
import { lockUser } from '../entitlements.locks.js';
import type { LimitKey } from '../entitlements.types.js';
import { effectiveStatus, type SubscriptionSource } from '../rules/plan-rules.js';
import { grantLimits, SourcesRepository } from '../sources/sources.repository.js';
import { grantRefusal, touchesAiLimits, type GrantRefusalReason } from './grant-rules.js';
import type { CreateGrantBody, ListGrantsQuery, UpdateGrantBody } from './grants.schemas.js';

type GrantRow = Prisma.EntitlementGrantGetPayload<object>;
type ChangeRow = Prisma.EntitlementGrantChangeGetPayload<object>;
type StaffRole = 'admin' | 'editor';

export type GrantChangeView = {
  id: string; grant_id: string; changed_by: string; changed_by_role: string; old_starts_at: string; new_starts_at: string;
  old_ends_at: string; new_ends_at: string; reason: string; created_at: string;
};

export type GrantView = {
  id: string; user_id: string; kind: 'plan' | 'limits'; plan: 'pro' | null; limits: Partial<Record<LimitKey, number>> | null;
  starts_at: string; ends_at: string; reason: string; granted_by: string; granted_by_role: string; revoked_at: string | null;
  revoked_by: string | null; revoke_reason: string | null; paid_renewal_action: string | null; created_at: string;
  changes?: GrantChangeView[];
};

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const DAY_MS = 86_400_000;
const LIVE_STATUSES = new Set(['trialing', 'active', 'grace']);

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const invalid = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
const forbidden = () => new ProblemDetailsException({ status: 403, title: 'Forbidden', type: 'forbidden' });
const notActive = () => new ProblemDetailsException({ status: 409, title: 'Grant not active', type: 'grant-not-active' });
const notAllowed = (reason: GrantRefusalReason) => new ProblemDetailsException({
  status: 409, title: 'Grant not allowed', type: 'grant-not-allowed', extensions: { reason },
});

const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: z.string() });

export function grantView(row: GrantRow, changes?: ChangeRow[]): GrantView {
  return {
    id: row.id, user_id: row.userId, kind: row.kind as GrantView['kind'], plan: row.plan as GrantView['plan'],
    limits: row.kind === 'limits' ? grantLimits(row.limits) : null, starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt.toISOString(), reason: row.reason, granted_by: row.grantedBy, granted_by_role: row.grantedByRole,
    revoked_at: row.revokedAt?.toISOString() ?? null, revoked_by: row.revokedBy, revoke_reason: row.revokeReason,
    paid_renewal_action: row.paidRenewalAction, created_at: row.createdAt.toISOString(),
    ...(changes ? { changes: changes.map(changeView) } : {}),
  };
}

function changeView(row: ChangeRow): GrantChangeView {
  return {
    id: row.id, grant_id: row.grantId, changed_by: row.changedBy, changed_by_role: row.changedByRole,
    old_starts_at: row.oldStartsAt.toISOString(), new_starts_at: row.newStartsAt.toISOString(),
    old_ends_at: row.oldEndsAt.toISOString(), new_ends_at: row.newEndsAt.toISOString(), reason: row.reason,
    created_at: row.createdAt.toISOString(),
  };
}

/** Resolves to `false` instead of throwing when `call` fails or outlasts `ms` (R6: an adapter never holds a request up). */
async function settles(call: () => Promise<void>, ms: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), ms); });
  try {
    return await Promise.race([call().then(() => true, () => false), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Staff grants (design §10): create, revoke, change dates (D38), list. Profiles and Settings are read before each
 * transaction; inside it, `lockUser(target)` serialises the user's grant writes and every query goes through `tx`.
 * Adapter calls run after commit (R6). Logs carry ids only: never a reason or an email (SR10).
 */
@Injectable()
export class GrantsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(SourcesRepository) private readonly sources: SourcesRepository,
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async create(actorId: string, body: CreateGrantBody): Promise<GrantView> {
    const now = this.clock.now();
    const target = await this.identity.getProfile(body.user_id);
    if (!target) throw notFound();
    const actorRole = await this.roleOf(actorId);
    const refusal = grantRefusal({
      action: 'create', actorId, actorRole, targetId: target.id, targetRole: target.staff_role,
      touchesAiLimits: body.kind === 'limits' && touchesAiLimits(body.limits ?? null),
    });
    if (refusal) throw notAllowed(refusal);
    const startsAt = body.starts_at ? new Date(body.starts_at) : now;
    const endsAt = new Date(body.ends_at);
    if (startsAt.getTime() < now.getTime() - GRANT_START_SKEW_MS) throw invalid();
    if (endsAt.getTime() <= Math.max(startsAt.getTime(), now.getTime())) throw invalid();
    const { entitlements } = await this.settings.get();

    const { row, paid } = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, target.id);
      const { subscriptions } = await this.sources.load(tx, target.id, now);
      // Every subscription renews automatically (D35): a live, not cancelled one is a paid renewal the grant must turn off (D32).
      const paid = body.kind === 'plan'
        ? subscriptions.filter((sub) => !sub.cancelAtPeriodEnd
          && LIVE_STATUSES.has(effectiveStatus(sub, now, entitlements.graceDays).status))
        : [];
      if (paid.length > 0 && body.confirm_turn_off_paid_renewal !== true) throw notAllowed('target-has-paid-subscription');
      if (body.kind === 'plan' && startsAt <= now) {
        // A plan grant that starts now is the new plan (D32); one that starts later revokes nothing (D38).
        await tx.entitlementGrant.updateMany({
          where: { userId: target.id, kind: 'plan', revokedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
          data: { revokedAt: now, revokedBy: actorId, revokeReason: 'replaced' },
        });
      }
      const row = await tx.entitlementGrant.create({ data: {
        userId: target.id, kind: body.kind, plan: body.kind === 'plan' ? 'pro' : null,
        ...(body.kind === 'limits' ? { limits: body.limits } : {}), startsAt, endsAt, reason: body.reason,
        grantedBy: actorId, grantedByRole: actorRole,
        // Milliseconds from the clock, not the column's microsecond default: the list's page token keeps milliseconds.
        createdAt: now,
      } });
      return { row, paid };
    }, transactionOptions);
    this.logger.info('entitlement_grant_created', { grant_id: row.id, user_id: row.userId, granted_by: actorId, kind: row.kind });

    if (paid.length === 0) return grantView(row);
    const action = await this.turnOffPaidRenewals(paid);
    return grantView(await this.prisma.entitlementGrant.update({ where: { id: row.id }, data: { paidRenewalAction: action } }));
  }

  async revoke(actorId: string, grantId: string, reason: string): Promise<GrantView> {
    const { grant, actorRole, targetRole } = await this.context(actorId, grantId);
    const now = this.clock.now();
    const row = await this.prisma.$transaction(async (tx) => {
      await lockUser(tx, grant.userId);
      const current = await this.lockGrant(tx, grantId);
      if (current.revokedAt) return current;
      if (current.endsAt <= now) throw notActive();
      const refusal = grantRefusal({
        action: 'revoke', actorId, actorRole, targetId: current.userId, targetRole,
        touchesAiLimits: current.kind === 'limits' && touchesAiLimits(grantLimits(current.limits)),
      });
      if (refusal) throw notAllowed(refusal);
      const updated = await tx.entitlementGrant.update({
        where: { id: grantId }, data: { revokedAt: now, revokedBy: actorId, revokeReason: reason },
      });
      this.logger.info('entitlement_grant_revoked', { grant_id: grantId, user_id: updated.userId, revoked_by: actorId });
      return updated;
    }, transactionOptions);
    return grantView(row);
  }

  async update(actorId: string, grantId: string, body: UpdateGrantBody): Promise<GrantView> {
    const { grant, actorRole, targetRole } = await this.context(actorId, grantId);
    const now = this.clock.now();
    return this.prisma.$transaction(async (tx) => {
      await lockUser(tx, grant.userId);
      const current = await this.lockGrant(tx, grantId);
      if (current.revokedAt || current.endsAt <= now) throw notActive();
      const refusal = grantRefusal({
        action: 'update', actorId, actorRole, targetId: current.userId, targetRole,
        touchesAiLimits: current.kind === 'limits' && touchesAiLimits(grantLimits(current.limits)),
      });
      if (refusal) throw notAllowed(refusal);
      const startsAt = body.starts_at ? new Date(body.starts_at) : current.startsAt;
      const endsAt = body.ends_at ? new Date(body.ends_at) : current.endsAt;
      const startsChanged = startsAt.getTime() !== current.startsAt.getTime();
      // A started grant's starts_at is its AI cycle anchor and stays fixed (D38).
      if (startsChanged && (current.startsAt <= now || startsAt.getTime() < now.getTime() - GRANT_START_SKEW_MS)) throw invalid();
      if (endsAt.getTime() <= Math.max(startsAt.getTime(), now.getTime())) throw invalid();
      if (!startsChanged && endsAt.getTime() === current.endsAt.getTime()) {
        return grantView(current, await this.changesOf(tx, grantId));
      }
      const old = { startsAt: current.startsAt, endsAt: current.endsAt };
      const updated = await tx.entitlementGrant.update({ where: { id: grantId }, data: { startsAt, endsAt } });
      await tx.entitlementGrantChange.create({ data: {
        grantId, changedBy: actorId, changedByRole: actorRole, oldStartsAt: old.startsAt, newStartsAt: startsAt,
        oldEndsAt: old.endsAt, newEndsAt: endsAt, reason: body.reason,
      } });
      this.logger.info('entitlement_grant_updated', { grant_id: grantId, user_id: updated.userId, changed_by: actorId });
      return grantView(updated, await this.changesOf(tx, grantId));
    }, transactionOptions);
  }

  /** Newest first; `active` = not revoked and not ended; `expiring_within_days` = active and ending within N days. */
  async list(query: ListGrantsQuery): Promise<{ items: GrantView[]; next_page_token: string | null }> {
    const now = this.clock.now();
    const binding = createHash('sha256').update(JSON.stringify({
      route: 'entitlement-grants', user_id: query.user_id ?? null, granted_by: query.granted_by ?? null,
      active: query.active ?? null, expiring_within_days: query.expiring_within_days ?? null,
    })).digest('hex');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (query.page_token !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(query.page_token, binding));
      if (!parsed.success) throw invalid();
      cursor = parsed.data;
    }
    const active = { revokedAt: null, endsAt: { gt: now } };
    const where: Prisma.EntitlementGrantWhereInput = {
      ...(query.user_id ? { userId: query.user_id } : {}),
      ...(query.granted_by ? { grantedBy: query.granted_by } : {}),
      AND: [
        ...(query.active === 'true' ? [active] : []),
        ...(query.active === 'false' ? [{ OR: [{ revokedAt: { not: null } }, { endsAt: { lte: now } }] }] : []),
        ...(query.expiring_within_days !== undefined
          ? [active, { endsAt: { lte: new Date(now.getTime() + query.expiring_within_days * DAY_MS) } }] : []),
        ...(cursor ? [{ OR: [
          { createdAt: { lt: new Date(cursor.created_at) } },
          { createdAt: new Date(cursor.created_at), id: { lt: cursor.id } },
        ] }] : []),
      ],
    };
    const rows = await this.prisma.entitlementGrant.findMany({
      where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.page_size + 1,
    });
    const page = rows.slice(0, query.page_size);
    const last = page.at(-1);
    return {
      items: page.map((row) => grantView(row)),
      next_page_token: rows.length > query.page_size && last
        ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  /** Every grant of one user, newest first (at most 100), each with its date changes (D38). */
  async forUser(userId: string): Promise<GrantView[]> {
    const rows = await this.prisma.entitlementGrant.findMany({
      where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
      include: { changes: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] } },
    });
    return rows.map(({ changes, ...row }) => grantView(row, changes));
  }

  private async roleOf(actorId: string): Promise<StaffRole> {
    const role = (await this.identity.getProfile(actorId))?.staff_role;
    if (role !== 'admin' && role !== 'editor') throw forbidden();
    return role;
  }

  /** Before a revoke or a date change: the grant, the actor's role and the target's **current** role (B5E38). */
  private async context(actorId: string, grantId: string) {
    const grant = await this.prisma.entitlementGrant.findUnique({ where: { id: grantId } });
    if (!grant) throw notFound();
    const actorRole = await this.roleOf(actorId);
    const targetRole = (await this.identity.getProfile(grant.userId))?.staff_role ?? null;
    return { grant, actorRole, targetRole };
  }

  private async lockGrant(tx: Prisma.TransactionClient, grantId: string): Promise<GrantRow> {
    await tx.$queryRaw`SELECT id FROM entitlement_grants WHERE id = ${grantId}::uuid FOR UPDATE`;
    return tx.entitlementGrant.findUniqueOrThrow({ where: { id: grantId } });
  }

  private changesOf(tx: Prisma.TransactionClient, grantId: string): Promise<ChangeRow[]> {
    return tx.entitlementGrantChange.findMany({ where: { grantId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  /** `turned_off` when every paid subscription's adapter turned its renewal off; otherwise `not_supported` (D32, B5E80). */
  private async turnOffPaidRenewals(paid: SubscriptionSource[]): Promise<'turned_off' | 'not_supported'> {
    let all = true;
    for (const sub of paid) {
      const adapter = this.registry.get(sub.provider);
      const turnOff = adapter?.cancelAtPeriodEnd?.bind(adapter);
      const done = turnOff ? await settles(() => turnOff(sub.externalSubscriptionId), BILLING_ADAPTER_TIMEOUT_MS) : false;
      if (!done) {
        all = false;
        this.logger.warn('paid_renewal_not_cancelled', { subscription_id: sub.id });
      }
    }
    return all ? 'turned_off' : 'not_supported';
  }
}
