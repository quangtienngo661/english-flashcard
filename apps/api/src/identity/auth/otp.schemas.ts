import { z } from 'zod';
import { registerSchema } from './auth.schemas.js';

export const otpRequestSchema = z.discriminatedUnion('purpose', [
  z.strictObject({ purpose: z.literal('verify_email'), email: z.string().max(320) }),
  z.strictObject({ purpose: z.literal('reset_password'), email: z.string().max(320) }),
]);
export const verifyEmailSchema = registerSchema.pick({ email: true, password: true, client: true, device_label: true })
  .extend({ code: z.string().max(20) });
export type OtpRequest = z.infer<typeof otpRequestSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
