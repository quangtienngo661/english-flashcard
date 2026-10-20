import { z } from 'zod';
import { optionalPersonNameSchema, personNameSchema } from './person.js';

export const updateProfileSchema = z.strictObject({
  native_language: z.enum(['vi', 'en']).optional(),
  timezone: z.string().max(64).optional(),
  given_name: personNameSchema.optional(),
  family_name: optionalPersonNameSchema.optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
