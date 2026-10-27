import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
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

export type GrantChangeWithUser = GrantChangeView & { changed_by_user: UserRef };

/** `ai-limits-admin-only` and `target-has-paid-subscription` cannot occur: no limits are touched and nothing is created. */
export type GrantLookup = {
  user: { id: string; email: string }; grantable: boolean; reason: 'self-grant' | 'target-is-admin' | 'target-is-staff' | null;
};

export type GrantStatus = 'active' | 'scheduled' | 'revoked' | 'expired' | 'replaced';

export type GrantView = {
  id: string; user_id: string; kind: 'plan' | 'limits'; plan: 'pro' | null; limits: Partial<Record<LimitKey, number>> | null;
  starts_at: string; ends_at: string; reason: string; granted_by: string; granted_by_role: string; revoked_at: string | null;
  revoked_by: string | null; revoke_reason: string | null; paid_renewal_action: string | null; created_at: string;
  user: UserRef; granted_by_user: UserRef; revoked_by_user: UserRef | null; status: GrantStatus;
  last_change: GrantChangeWithUser | null;
  changes?: GrantChangeWithUser[];
};

/** What `grantView` needs beside the row: one clock reading, the sibling check (T7), the page's emails and newest change. */
export type GrantViewContext = {
  now: Date; replaced: boolean; emails: ReadonlyMap<string, string>; lastChange: ChangeRow | null;
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

/** Design §5.4 10.4, checked in this order: replaced → revoked → expired → scheduled → active. */
export function grantStatus(
  row: Pick<GrantRow, 'revokedAt' | 'startsAt' | 'endsAt'>, now: Date, replaced: boolean,
): GrantStatus {
  if (replaced) return 'replaced';
  if (row.revokedAt) return 'revoked';
  if (row.endsAt.getTime() <= now.getTime()) return 'expired';
  if (row.startsAt.getTime() > now.getTime()) return 'scheduled';
  return 'active';
}

export function grantView(row: GrantRow, ctx: GrantViewContext, changes?: ChangeRow[]): GrantView {
  return {
    id: row.id, user_id: row.userId, kind: row.kind as GrantView['kind'], plan: row.plan as GrantView['plan'],
    limits: row.kind === 'limits' ? grantLimits(row.limits) : null, starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt.toISOString(), reason: row.reason, granted_by: row.grantedBy, granted_by_role: row.grantedByRole,
    revoked_at: row.revokedAt?.toISOString() ?? null, revoked_by: row.revokedBy, revoke_reason: row.revokeReason,
    paid_renewal_action: row.paidRenewalAction, created_at: row.createdAt.toISOString(),
    user: userRef(row.userId, ctx.emails), granted_by_user: userRef(row.grantedBy, ctx.emails),
    revoked_by_user: row.revokedBy ? userRef(row.revokedBy, ctx.emails) : null,
    status: grantStatus(row, ctx.now, ctx.replaced),
    last_change: ctx.lastChange ? changeView(ctx.lastChange, ctx.emails) : null,
    ...(changes ? { changes: changes.map((change) => changeView(change, ctx.emails)) } : {}),
  };
}

function changeView(row: ChangeRow, emails: ReadonlyMap<string, string>): GrantChangeWithUser {
  return {
    id: row.id, grant_id: row.grantId, changed_by: row.changedBy, changed_by_role: row.changedByRole,
    old_starts_at: row.oldStartsAt.toISOString(), new_starts_at: row.newStartsAt.toISOString(),
    old_ends_at: row.oldEndsAt.toISOString(), new_ends_at: row.newEndsAt.toISOString(), reason: row.reason,
    created_at: row.createdAt.toISOString(), changed_by_user: userRef(row.changedBy, emails),
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

    if (paid.length === 0) return this.viewOne(row);
    const action = await this.turnOffPaidRenewals(paid);
    return this.viewOne(await this.prisma.entitlementGrant.update({ where: { id: row.id }, data: { paidRenewalAction: action } }));
  }

  /** Before the grant form: who the address is and whether this staff account may grant to them (design §5.2). */
  async lookup(actorId: string, email: string): Promise<GrantLookup> {
    const targetId = await this.identity.findUserIdByEmail(email);
    if (targetId === null) throw notFound();
    const target = await this.identity.getProfile(targetId);
    if (!target) throw notFound();
    const actorRole = await this.roleOf(actorId);
    const reason = grantRefusal({
      action: 'create', actorId, actorRole, targetId: target.id, targetRole: target.staff_role, touchesAiLimits: false,
    }) as GrantLookup['reason'];
    return { user: { id: target.id, email: target.email }, grantable: reason === null, reason };
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
    return this.viewOne(row);
  }

  async update(actorId: string, grantId: string, body: UpdateGrantBody): Promise<GrantView> {
    const { grant, actorRole, targetRole } = await this.context(actorId, grantId);
    const now = this.clock.now();
    const { row, changes } = await this.prisma.$transaction(async (tx) => {
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
        return { row: current, changes: await this.changesOf(tx, grantId) };
      }
      const old = { startsAt: current.startsAt, endsAt: current.endsAt };
      const updated = await tx.entitlementGrant.update({ where: { id: grantId }, data: { startsAt, endsAt } });
      await tx.entitlementGrantChange.create({ data: {
        grantId, changedBy: actorId, changedByRole: actorRole, oldStartsAt: old.startsAt, newStartsAt: startsAt,
        oldEndsAt: old.endsAt, newEndsAt: endsAt, reason: body.reason,
      } });
      this.logger.info('entitlement_grant_updated', { grant_id: grantId, user_id: updated.userId, changed_by: actorId });
      return { row: updated, changes: await this.changesOf(tx, grantId) };
    }, transactionOptions);
    return (await this.views([{ row, changes }]))[0]!;
  }

  /** Newest first; `active` = not revoked and not ended; `expiring_within_days` = active and ending within N days. */
  async list(query: ListGrantsQuery): Promise<{ items: GrantView[]; next_page_token: string | null }> {
    const now = this.clock.now();
    const binding = createHash('sha256').update(JSON.stringify({
      route: 'entitlement-grants', user_id: query.user_id ?? null, granted_by: query.granted_by ?? null,
      user_email: query.user_email ?? null, granted_by_email: query.granted_by_email ?? null,
      active: query.active ?? null, expiring_within_days: query.expiring_within_days ?? null,
    })).digest('hex');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (query.page_token !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(query.page_token, binding));
      if (!parsed.success) throw invalid();
      cursor = parsed.data;
    }
    // An address no account has matches nothing (design §5.2); with the id filter too, both apply.
    const byEmail: Prisma.EntitlementGrantWhereInput[] = [];
    for (const [email, field] of [[query.user_email, 'userId'], [query.granted_by_email, 'grantedBy']] as const) {
      if (email === undefined) continue;
      const id = await this.identity.findUserIdByEmail(email);
      if (id === null) return { items: [], next_page_token: null };
      byEmail.push({ [field]: id });
    }
    const active = { revokedAt: null, endsAt: { gt: now } };
    const where: Prisma.EntitlementGrantWhereInput = {
      ...(query.user_id ? { userId: query.user_id } : {}),
      ...(query.granted_by ? { grantedBy: query.granted_by } : {}),
      AND: [
        ...byEmail,
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
      items: await this.views(page.map((row) => ({ row }))),
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
    return this.views(rows.map(({ changes, ...row }) => ({ row, changes })));
  }

  /**
   * Ids of the rows another plan grant replaced (design §5.4 10.4, T7): `create` revokes the old plan grant with
   * `revokedAt = now, revokedBy = actor` and creates the new one with `createdAt = now, grantedBy = actor` in one transaction.
   * One query; the sibling may be on another page or filtered out, so it is looked up in the table, not among `rows`.
   */
  async replacedIds(rows: GrantRow[]): Promise<Set<string>> {
    const candidates = rows.filter((row) => row.revokedAt !== null && row.revokedBy !== null);
    if (candidates.length === 0) return new Set();
    const siblings = await this.prisma.entitlementGrant.findMany({
      where: { kind: 'plan', OR: candidates.map((row) => ({ userId: row.userId, createdAt: row.revokedAt!, grantedBy: row.revokedBy! })) },
      select: { id: true, userId: true, createdAt: true, grantedBy: true },
    });
    return new Set(candidates.filter((row) => siblings.some((sibling) => sibling.id !== row.id && sibling.userId === row.userId
      && sibling.createdAt.getTime() === row.revokedAt!.getTime() && sibling.grantedBy === row.revokedBy)).map((row) => row.id));
  }

  /** The newest date change of each grant, in one query (design §5.4 10.5). */
  async lastChanges(grantIds: string[]): Promise<Map<string, ChangeRow>> {
    if (grantIds.length === 0) return new Map();
    const rows = await this.prisma.entitlementGrantChange.findMany({
      where: { grantId: { in: grantIds } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const newest = new Map<string, ChangeRow>();
    for (const row of rows) if (!newest.has(row.grantId)) newest.set(row.grantId, row);
    return newest;
  }

  /**
   * Views of a page: status, people (one `emailsOf` call) and the newest change. An entry with `changes` (newest first) shows
   * them and takes its newest change from them. Never called inside a transaction (`emailsOf` must not run under `lockUser`).
   */
  private async views(entries: Array<{ row: GrantRow; changes?: ChangeRow[] }>): Promise<GrantView[]> {
    const now = this.clock.now();
    const rows = entries.map((entry) => entry.row);
    const [replaced, queried] = await Promise.all([
      this.replacedIds(rows),
      this.lastChanges(entries.filter((entry) => !entry.changes).map((entry) => entry.row.id)),
    ]);
    const lastOf = entries.map((entry) => (entry.changes ? entry.changes[0] : queried.get(entry.row.id)) ?? null);
    const people = entries.flatMap((entry, i) => [
      entry.row.userId, entry.row.grantedBy, entry.row.revokedBy, lastOf[i]?.changedBy,
      ...(entry.changes ?? []).map((change) => change.changedBy),
    ]).filter((id): id is string => typeof id === 'string');
    const emails = await this.identity.emailsOf([...new Set(people)]);
    return entries.map((entry, i) => grantView(entry.row, {
      now, replaced: replaced.has(entry.row.id), emails, lastChange: lastOf[i] ?? null,
    }, entry.changes));
  }

  private async viewOne(row: GrantRow): Promise<GrantView> {
    return (await this.views([{ row }]))[0]!;
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
