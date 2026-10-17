import { z } from 'zod';
import { normalizeText } from '../catalog/normalize.js';
import { LEMMA_MAX, LEVELS, VALID_POS } from '../content.constants.js';

/** Search text: NFC, trimmed, lower-case, 1..100 code points (search and lookup ignore case, D42). */
const searchText = z.string().transform((value) => normalizeText(value).toLowerCase())
  .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= LEMMA_MAX);

export const wordsQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional(),
  q: searchText.optional(), level: z.enum(LEVELS).optional(), pos: z.enum(VALID_POS).optional(),
  topic: z.string().transform((value) => normalizeText(value).toLowerCase()).pipe(z.string().min(1).regex(/^[a-z0-9-]+$/)).optional(),
  mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});
/** A word page matches the lemma exactly: upper and lower case are separate words (D42). */
export const wordParams = z.strictObject({
  lemma: z.string().transform(normalizeText)
    .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= LEMMA_MAX),
});
export const lookupQuery = z.strictObject({ q: searchText });
