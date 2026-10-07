import { z } from 'zod';

export const findUserQuerySchema = z.strictObject({ email: z.string().max(320) });
export const listStaffQuerySchema = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
export const idParam = z.uuid();
export const staffUserParamsSchema = z.strictObject({ id: idParam });
export const setStaffRoleSchema = z.strictObject({ staff_role: z.enum(['admin', 'editor']).nullable() });

export type FindUserQuery = z.infer<typeof findUserQuerySchema>;
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type StaffUserParams = z.infer<typeof staffUserParamsSchema>;
export type SetStaffRoleBody = z.infer<typeof setStaffRoleSchema>;
