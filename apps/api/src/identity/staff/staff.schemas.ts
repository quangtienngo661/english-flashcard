import { z } from 'zod';
import { birthDateSchema, optionalPersonNameSchema, personNameSchema } from '../profile/person.js';

const noNul = (value: string) => !value.includes('\u0000');
/** NFC (names are stored NFC) then trim, 2-100 code points, no NUL (Postgres rejects it in text). */
const searchText = z.string().transform((value) => value.normalize('NFC').trim()).refine((value) => {
  const length = [...value].length;
  return length >= 2 && length <= 100 && noNul(value);
});
export const adminUsersQuerySchema = z.strictObject({
  email: z.string().max(320).refine(noNul, 'Email cannot contain NUL').optional(),
  q: searchText.optional(),
  status: z.enum(['active', 'locked']).optional(),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
}).refine((query) => query.email === undefined || (query.q === undefined && query.status === undefined && query.page_token === undefined
  && query.page_size === 20), { message: 'email excludes the other filters' });
export const listStaffQuerySchema = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
export const idParam = z.uuid();
export const staffUserParamsSchema = z.strictObject({ id: idParam });
export const setStaffRoleSchema = z.strictObject({ staff_role: z.enum(['admin', 'editor']).nullable() });
/** NFC + trim, then 1-500 code points with no control characters; the normalized text is what gets stored. */
export const lockUserSchema = z.strictObject({
  reason: z.string().transform((value) => value.normalize('NFC').trim())
    .refine((value) => [...value].length >= 1 && [...value].length <= 500 && !/\p{Cc}/u.test(value)),
});
export const createAccountSchema = z.strictObject({
  email: z.string().max(320),
  // AD18: null creates a learner.
  staff_role: z.enum(['admin', 'editor']).nullable(),
  password: z.string().optional(),
  must_change_password: z.boolean(),
  timezone: z.string().max(64),
  given_name: personNameSchema.optional(),
  family_name: optionalPersonNameSchema.optional(),
});

// AD18: the admin edits a user's profile and email; every field optional, at least one.
export const updateUserSchema = z.strictObject({
  email: z.string().max(320).optional(),
  given_name: personNameSchema.optional(),
  family_name: optionalPersonNameSchema.optional(),
  birth_date: birthDateSchema.optional(),
  timezone: z.string().max(64).optional(),
}).refine((body) => Object.keys(body).length > 0);

// AD18: no password means a generated one; it reaches the user only by mail.
export const resetPasswordSchema = z.strictObject({
  password: z.string().optional(),
  must_change_password: z.boolean(),
});

export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type CreateAccountBody = z.infer<typeof createAccountSchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type StaffUserParams = z.infer<typeof staffUserParamsSchema>;
export type SetStaffRoleBody = z.infer<typeof setStaffRoleSchema>;
export type LockUserBody = z.infer<typeof lockUserSchema>;
