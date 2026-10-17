import { z } from 'zod';
import { GROUP_NAME_MAX } from '../learning.constants.js';

/** NFC + trim, then 1–60 code points (Global Constraints). */
export const groupName = z.string().transform((value) => value.trim().normalize('NFC'))
  .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= GROUP_NAME_MAX);

export const groupParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
export const createGroupBody = z.strictObject({ name: groupName });
export const renameGroupBody = z.strictObject({ name: groupName, version: z.number().int().min(0) });
