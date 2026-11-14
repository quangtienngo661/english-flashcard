import { z } from 'zod';
import { birthDateSchema, optionalPersonNameSchema, personNameSchema } from '../profile/person.js';

// Required by TurnstileGuard, whose check runs before any schema; `optional` here because the guard is off in unit tests
// and the schema is a constant built at load time.
export const turnstileTokenSchema = z.string().min(1).max(2048).optional();

export const registerSchema = z.strictObject({
  // PostgreSQL text/varchar cannot store a zero byte. Reject it as client input.
  email: z.string().max(320).refine((value) => !value.includes('\u0000'), 'Email cannot contain NUL'),
  password: z.string(),
  timezone: z.string().max(64),
  client: z.enum(['web', 'mobile']),
  given_name: personNameSchema,
  family_name: optionalPersonNameSchema.optional(),
  birth_date: birthDateSchema,
  accept_terms: z.literal(true),
  device_label: z.string().max(100).refine((value) => !value.includes('\u0000'), 'Device label cannot contain NUL').optional(),
  turnstile_token: turnstileTokenSchema,
});
// `.extend`, not a pick of the field: verifyEmailSchema is also a pick of registerSchema and must stay without the token (LA1E14).
export const loginSchema = registerSchema.pick({ email: true, password: true, client: true, device_label: true })
  .extend({ turnstile_token: turnstileTokenSchema });
export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
