import { z } from 'zod';

export const otpRequestSchema = z.discriminatedUnion('purpose', [
  z.strictObject({ purpose: z.literal('verify_email') }),
  z.strictObject({ purpose: z.literal('reset_password'), email: z.string().max(320) }),
]);
export const verifyEmailSchema = z.strictObject({ code: z.string().max(20) });
export type OtpRequest = z.infer<typeof otpRequestSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
