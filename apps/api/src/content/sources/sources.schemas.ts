import { z } from 'zod';

const name = z.string().trim().min(1);
const version = z.string().trim();
// Public on GET /v1/sources and rendered as a link later: only http(s), never javascript: or data:.
const url = z.url({ protocol: /^https?$/ }).nullable();
const license = z.string().trim();
const attribution = z.string().trim();
const displayPriority = z.number().int().min(-2_147_483_648).max(2_147_483_647);

export const createSourceSchema = z.strictObject({
  kind: z.literal('third_party').default('third_party'),
  name,
  version: version.default(''),
  url: url.default(null),
  license: license.default(''),
  attribution: attribution.default(''),
  display_priority: displayPriority.default(100),
});

// `kind` is not editable. No defaults here: a key that is not sent is not written.
export const updateSourceSchema = z.strictObject({
  name: name.optional(),
  version: version.optional(),
  url: url.optional(),
  license: license.optional(),
  attribution: attribution.optional(),
  display_priority: displayPriority.optional(),
}).refine((body) => Object.keys(body).length > 0);

export const sourceParamsSchema = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });

export type CreateSourceBody = z.infer<typeof createSourceSchema>;
export type UpdateSourceBody = z.infer<typeof updateSourceSchema>;
export type SourceParams = z.infer<typeof sourceParamsSchema>;
