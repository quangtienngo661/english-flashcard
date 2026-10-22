import { z } from 'zod';
import { LEVELS, VALID_POS } from '../../content/index.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());

export const groupParams = z.strictObject({ id: uuid });
export const groupItemParams = z.strictObject({ id: uuid, itemId: uuid });
export const itemParams = z.strictObject({ id: uuid });
export const addItemBody = z.strictObject({ sense_id: uuid });
export const bulkAddBody = z.strictObject({
  level: z.enum(LEVELS).optional(),
  topic: z.string().regex(/^[a-z0-9-]+$/).optional(),
  pos: z.enum(VALID_POS).optional(),
  // Design §8.3: hand-picked senses (K/18), 1–100 distinct ids, never together with a filter.
  sense_ids: z.array(uuid).min(1).max(100).refine((ids) => new Set(ids).size === ids.length).optional(),
}).refine((body) => body.sense_ids === undefined || (body.level === undefined && body.topic === undefined && body.pos === undefined));
export const statesQuery = z.strictObject({
  sense_ids: z.string().transform((value) => value.split(',')).pipe(z.array(uuid).min(1).max(100)),
});
export const groupItemsQuery = z.strictObject({
  cell: z.enum(['priority', '0', '1', '2', '3', '4', '5'])
    .transform((value) => (value === 'priority' ? value : Number(value) as 0 | 1 | 2 | 3 | 4 | 5)).optional(),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
