import { z } from 'zod';

export const createSourceSchema = z.strictObject({
  kind: z.literal('third_party').default('third_party'),
  name: z.string().trim().min(1),
  version: z.string().trim().default(''),
  // Public on GET /v1/sources and rendered as a link later: only http(s), never javascript: or data:.
  url: z.url({ protocol: /^https?$/ }).nullable().default(null),
  license: z.string().trim().default(''),
  attribution: z.string().trim().default(''),
  display_priority: z.number().int().min(-2_147_483_648).max(2_147_483_647).default(100),
});

export type CreateSourceBody = z.infer<typeof createSourceSchema>;
