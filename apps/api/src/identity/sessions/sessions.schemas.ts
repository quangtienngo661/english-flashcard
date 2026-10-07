import { z } from 'zod';

export const refreshBodySchema = z.strictObject({
  refresh_token: z.string().min(1).max(200).optional(),
});

export type RefreshBody = z.infer<typeof refreshBodySchema>;
