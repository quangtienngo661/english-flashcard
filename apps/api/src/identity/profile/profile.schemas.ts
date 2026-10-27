import { z } from 'zod';
import { birthDateSchema, optionalPersonNameSchema, personNameSchema } from './person.js';

export const updateProfileSchema = z.strictObject({
  native_language: z.enum(['vi', 'en']).optional(),
  timezone: z.string().max(64).optional(),
  given_name: personNameSchema.optional(),
  family_name: optionalPersonNameSchema.optional(),
  // Design §8.1: correctable, never cleared (no null); the 13+ and "not after today" checks are the service's.
  birth_date: birthDateSchema.optional(),
  // AD18: an account made by an admin (or older than the consent column) accepts the terms here; only `true` is meaningful.
  accept_terms: z.literal(true).optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
