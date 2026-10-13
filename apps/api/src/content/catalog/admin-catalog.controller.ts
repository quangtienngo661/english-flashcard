import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { LEVELS } from '../content.constants.js';
import { AdminCatalogQueries } from './admin-catalog.queries.js';
import { normalizeText } from './normalize.js';
import { sensesExportQuery } from './sense-filters.js';

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
const sensesQuery = sensesExportQuery.extend(pagination);
const senseParams = z.strictObject({ id: uuid });
const uuidPart = (length: number) => z.string().regex(new RegExp(`^[0-9a-fA-F]{${length}}$`));
const sensePathParams = z.strictObject({
  id8: uuidPart(8), id4a: uuidPart(4), id4b: uuidPart(4), id4c: uuidPart(4), id12: uuidPart(12),
}).transform(({ id8, id4a, id4b, id4c, id12 }) => ({ id: [id8, id4a, id4b, id4c, id12].join('-') })).pipe(senseParams);

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

  // Express 5 rejects inline param regexes. Literal UUID hyphens exclude 'export' at
  // routing time, independent of module order; the schema checks hex lengths and z.uuid().
  @Get('senses/:id8-:id4a-:id4b-:id4c-:id12')
  getSense(@Param({ schema: sensePathParams }) params: z.infer<typeof sensePathParams>) {
    return this.queries.getSense(params.id);
  }
}
