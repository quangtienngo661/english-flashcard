import { z } from 'zod';
import { birthDateSchema, optionalPersonNameSchema, personNameSchema } from '../profile/person.js';

/** `POST /v1/auth/google/complete` (design §5.5): the names only when Google gave none. */
export const googleCompleteSchema = z.strictObject({
  birth_date: birthDateSchema,
  accept_terms: z.literal(true),
  timezone: z.string().max(64),
  given_name: personNameSchema.optional(),
  family_name: optionalPersonNameSchema.optional(),
});
export type GoogleCompleteBody = z.infer<typeof googleCompleteSchema>;

/** `POST /v1/auth/google/reauth`: which language the page the person returns to is in. */
export const reauthSchema = z.strictObject({ locale: z.enum(['vi', 'en']).optional() });
export type ReauthBody = z.infer<typeof reauthSchema>;
