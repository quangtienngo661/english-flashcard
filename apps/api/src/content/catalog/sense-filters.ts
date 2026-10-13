import { z } from 'zod';
import { LEVELS, VALID_POS } from '../content.constants.js';
import { normalizeText } from './normalize.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());

/** Shared strict filters for the paged list and the unpaged CSV export. */
export const sensesExportQuery = z.strictObject({
  sense_id: z.union([uuid, z.array(uuid)]).transform((value) => [...new Set(Array.isArray(value) ? value : [value])].sort()).optional(),
  status: z.enum(['unpublishable', 'open_draft', 'published']).optional(),
  level: z.enum(LEVELS).optional(), pos: z.enum(VALID_POS).optional(),
  topic: z.string().transform((value) => normalizeText(value).toLowerCase()).pipe(z.string().min(1).regex(/^[a-z0-9-]+$/)).optional(),
  batch_id: uuid.optional(),
});
export type SenseFilter = z.infer<typeof sensesExportQuery>;
