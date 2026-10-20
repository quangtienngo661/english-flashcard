import { z } from 'zod';
import { optionalPersonNameSchema, personNameSchema } from '../profile/person.js';

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
  staff_role: z.enum(['admin', 'editor']),
  password: z.string().optional(),
  must_change_password: z.boolean(),
  timezone: z.string().max(64),
  given_name: personNameSchema.optional(),
  family_name: optionalPersonNameSchema.optional(),
});

export type CreateAccountBody = z.infer<typeof createAccountSchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type StaffUserParams = z.infer<typeof staffUserParamsSchema>;
export type SetStaffRoleBody = z.infer<typeof setStaffRoleSchema>;
export type LockUserBody = z.infer<typeof lockUserSchema>;
