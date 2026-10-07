import { z } from 'zod';

export const registerSchema = z.strictObject({
  // PostgreSQL text/varchar cannot store a zero byte. Reject it as client input.
  email: z.string().max(320).refine((value) => !value.includes('\u0000'), 'Email cannot contain NUL'),
  password: z.string(),
  timezone: z.string().max(64),
  client: z.enum(['web', 'mobile']),
  device_label: z.string().max(100).refine((value) => !value.includes('\u0000'), 'Device label cannot contain NUL').optional(),
});
export const loginSchema = registerSchema.omit({ timezone: true });
export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
