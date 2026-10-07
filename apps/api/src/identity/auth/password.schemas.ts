import { z } from 'zod';

export const changeSchema = z.strictObject({
  current_password: z.string(),
  new_password: z.string(),
});
export const resetSchema = z.strictObject({
  // PostgreSQL text cannot contain NUL; reject it before the account lookup.
  email: z.string().max(320).refine((value) => !value.includes('\u0000'), 'Email cannot contain NUL'),
  code: z.string().max(20),
  new_password: z.string(),
});
export type ChangeBody = z.infer<typeof changeSchema>;
export type ResetBody = z.infer<typeof resetSchema>;
