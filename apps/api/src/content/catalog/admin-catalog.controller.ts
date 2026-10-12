import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { LEVELS, VALID_POS } from '../content.constants.js';
import { AdminCatalogQueries } from './admin-catalog.queries.js';
import { normalizeText } from './normalize.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const pagination = {
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
};
const booleanFilter = z.enum(['true', 'false']).transform((value) => value === 'true');
const entriesQuery = z.strictObject({
  ...pagination,
  conflict: booleanFilter.optional(), has_sense: booleanFilter.optional(), level: z.enum(LEVELS).optional(),
  q: z.string().transform(normalizeText).refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= 100)
    .transform((value) => value.toLowerCase()).optional(),
  batch_id: uuid.optional(),
});
const sensesQuery = z.strictObject({
  ...pagination,
  sense_id: z.union([uuid, z.array(uuid)]).transform((value) => [...new Set(Array.isArray(value) ? value : [value])].sort()).optional(),
  status: z.enum(['unpublishable', 'open_draft', 'published']).optional(),
  level: z.enum(LEVELS).optional(), pos: z.enum(VALID_POS).optional(),
  topic: z.string().transform((value) => normalizeText(value).toLowerCase()).pipe(z.string().min(1).regex(/^[a-z0-9-]+$/)).optional(),
  batch_id: uuid.optional(),
});
const senseParams = z.strictObject({ id: uuid });

@Controller('admin/content')
@RequirePermission('content.edit')
export class AdminCatalogController {
  constructor(@Inject(AdminCatalogQueries) private readonly queries: AdminCatalogQueries) {}

  @Get('entries')
  listEntries(@Query({ schema: entriesQuery }) query: z.infer<typeof entriesQuery>) {
    return this.queries.listEntries(query);
  }

  @Get('senses')
  listSenses(@Query({ schema: sensesQuery }) query: z.infer<typeof sensesQuery>) {
    return this.queries.listSenses(query);
  }

  @Get('senses/:id')
  getSense(@Param({ schema: senseParams }) params: z.infer<typeof senseParams>) {
    return this.queries.getSense(params.id);
  }
}
