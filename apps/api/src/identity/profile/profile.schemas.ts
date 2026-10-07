import { z } from 'zod';

export const updateProfileSchema = z.strictObject({
  native_language: z.enum(['vi', 'en']).optional(),
  timezone: z.string().max(64).optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
