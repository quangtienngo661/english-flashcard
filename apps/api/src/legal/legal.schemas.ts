import { z } from 'zod';

/** One text of a version: Markdown, at most 20 000 characters; the four together are capped by bytes in `saveSchema`. */
const text = z.string().max(20_000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const uuid = z.uuid().transform((id) => id.toLowerCase());

/** The four texts and the date are replaced as a whole; `privacy_en` / `terms_en` are `null` when there is no English text. */
export const saveSchema = z.strictObject({
  expected_version: z.number().int().min(1),
  privacy_vi: text,
  terms_vi: text,
  privacy_en: text.nullable(),
  terms_en: text.nullable(),
  effective_date: isoDate.nullable(),
}).refine(
  (body) => [body.privacy_vi, body.terms_vi, body.privacy_en, body.terms_en]
    .reduce((sum, value) => sum + Buffer.byteLength(value ?? '', 'utf8'), 0) <= 90_000,
  { message: 'The four texts together must stay under 90 000 bytes (the JSON body limit is 100 kB)', path: ['privacy_vi'] },
);
export type SaveBody = z.infer<typeof saveSchema>;

export const publishSchema = z.strictObject({ expected_version: z.number().int().min(1) });
export type PublishBody = z.infer<typeof publishSchema>;

export const createSchema = z.strictObject({ copy_from: uuid.optional() });
export type CreateBody = z.infer<typeof createSchema>;

export const idParams = z.strictObject({ id: uuid });
export type IdParams = z.infer<typeof idParams>;

export const listQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
export type ListQuery = z.infer<typeof listQuery>;
