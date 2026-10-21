import { z } from 'zod';
import { normalizeText } from '../catalog/normalize.js';
import { LEMMA_MAX, LEVELS, MEANING_MAX, PRIVATE_EXAMPLES_MAX, SENTENCE_MAX, VALID_POS } from '../content.constants.js';

/** NFC + trim, then 1..max code points (Review Focus 3: an emoji counts once). */
export const boundedText = (max: number) => z.string().transform(normalizeText)
  .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= max);
const uuid = z.uuid().transform((value) => value.toLowerCase());

export const myWordParams = z.strictObject({ id: uuid });
export const myWordPatch = z.strictObject({
  lemma: boundedText(LEMMA_MAX).optional(),
  pos: z.enum(VALID_POS).nullable().optional(),
  // Bước 7 plan choice 4: examples per sense (0..PRIVATE_EXAMPLES_MAX; [] removes them); a sense item changes at least one of the two.
  senses: z.array(z.strictObject({
    sense_id: uuid, meaning: boundedText(MEANING_MAX).optional(),
    examples: z.array(boundedText(SENTENCE_MAX)).max(PRIVATE_EXAMPLES_MAX).optional(),
  }).refine((sense) => sense.meaning !== undefined || sense.examples !== undefined)).min(1).max(100).optional(),
  level: z.enum(LEVELS).nullable().optional(),
  topics: z.array(z.string().transform((value) => normalizeText(value).toLowerCase())
    .pipe(z.string().min(1).regex(/^[a-z0-9-]+$/))).max(20).optional(),
}).refine((body) => Object.keys(body).length > 0);
export type MyWordPatch = z.infer<typeof myWordPatch>;
