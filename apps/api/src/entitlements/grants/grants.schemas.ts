import { z } from 'zod';
import { SETTINGS_BOUNDS } from '../../settings/index.js';
import { GRANT_REASON_MAX } from '../entitlements.constants.js';

// Request shapes of the staff grant routes (design §10 "Nhập", §12.2). Limits allow 0 and stop at the plan settings' maxima (R12).

const uuid = z.uuid().transform((value) => value.toLowerCase());
const instant = z.iso.datetime({ offset: true });
const reason = z.string().trim().min(1).max(GRANT_REASON_MAX);
const bounds = SETTINGS_BOUNDS.entitlements;
const count = (max: number) => z.number().int().min(0).max(max);

export const grantLimitsSchema = z.strictObject({
  practice_sessions_per_day: count(bounds.pro_practice_sessions_per_day.max).optional(),
  ai_practice_per_cycle: count(bounds.pro_ai_practice_per_cycle.max).optional(),
  ai_lookup_per_cycle: count(bounds.pro_ai_lookup_per_cycle.max).optional(),
}).refine((limits) => Object.keys(limits).length > 0);

export const createGrantSchema = z.strictObject({
  user_id: uuid,
  kind: z.enum(['plan', 'limits']),
  plan: z.literal('pro').optional(),
  limits: grantLimitsSchema.optional(),
  starts_at: instant.optional(),
  ends_at: instant,
  reason,
  confirm_turn_off_paid_renewal: z.boolean().optional(),
}).refine((body) => (body.kind === 'plan'
  ? body.plan === 'pro' && body.limits === undefined
  : body.plan === undefined && body.limits !== undefined));
export type CreateGrantBody = z.infer<typeof createGrantSchema>;

export const revokeGrantSchema = z.strictObject({ reason });

export const updateGrantSchema = z.strictObject({ starts_at: instant.optional(), ends_at: instant.optional(), reason })
  .refine((body) => body.starts_at !== undefined || body.ends_at !== undefined);
export type UpdateGrantBody = z.infer<typeof updateGrantSchema>;

export const grantIdParams = z.strictObject({ id: uuid });

export const listGrantsQuery = z.strictObject({
  user_id: uuid.optional(),
  granted_by: uuid.optional(),
  active: z.enum(['true', 'false']).optional(),
  expiring_within_days: z.coerce.number().int().min(1).max(365).optional(),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
export type ListGrantsQuery = z.infer<typeof listGrantsQuery>;
