import { z } from 'zod';

const noNul = (value: string) => !value.includes('\u0000');

/** `POST /v1/me/account/delete`: the learner confirms with the ticked box, the typed email and a password (or a Google proof). */
export const deleteMyAccountSchema = z.strictObject({
  confirm_email: z.string().max(320).refine(noNul, 'Email cannot contain NUL'),
  acknowledged: z.literal(true),
  password: z.string().max(1000).optional(),
});
export type DeleteMyAccountBody = z.infer<typeof deleteMyAccountSchema>;

/** `POST /v1/admin/users/:id/delete`: the admin types the account's email again (D17). */
export const adminDeleteUserSchema = z.strictObject({
  confirm_email: z.string().max(320).refine(noNul, 'Email cannot contain NUL'),
});
export type AdminDeleteUserBody = z.infer<typeof adminDeleteUserSchema>;
