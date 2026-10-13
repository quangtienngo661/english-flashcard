import { Module, StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_CONFIG } from '../../src/common/config/app-config.js';
import { ProblemDetailsFilter } from '../../src/common/problem-details/problem-details.filter.js';
import { AdminCatalogController } from '../../src/content/catalog/admin-catalog.controller.js';
import { AdminCatalogQueries } from '../../src/content/catalog/admin-catalog.queries.js';
import { ContentService, type ExportRow } from '../../src/content/index.js';
import { PermissionGuard } from '../../src/identity/staff/permission.guard.js';
import { ExportService } from '../../src/content-pipeline/export/export.service.js';
import { SensesExportController } from '../../src/content-pipeline/export/senses-export.controller.js';

const id = '12345678-abcd-4abc-8abc-123456789abc';
const row: ExportRow = {
  headword: 'analyze/analyse', pos: 'verb', gloss_vi: '=HYPERLINK("x")', definition_en: 'Analyze.',
  example_en_1: 'Analyze this.', example_en_2: '', example_en_3: '', topics: 'business', accepted_forms: '',
  context_label: null, sense_id: id, revision: 2, _status: 'draft', _level: 'B1',
};

// Controller/adapter unit test only: replace service boundaries, never instantiate a DB or queue.
// These dependency modules deliberately register the catalog controller before the export controller.
@Module({ controllers: [AdminCatalogController], providers: [
  { provide: AdminCatalogQueries, useValue: { getSense: (senseId: string) => ({ sense_id: senseId }) } },
  { provide: ContentService, useValue: { listExportRows: async () => ({ rows: [row] }) } },
], exports: [ContentService] })
class CatalogRoutingModule {}

@Module({ imports: [CatalogRoutingModule], controllers: [SensesExportController], providers: [
  ExportService, { provide: APP_CONFIG, useValue: { pipeline: { exportMaxRows: 5_000 } } },
] })
class ExportRoutingModule {}

describe('export controller routing (unit, no infrastructure)', () => {
  let app: INestApplication | undefined;
  const start = async (result: { rows: ExportRow[] } | { tooMany: true } = { rows: [row] }) => {
    const moduleRef = await Test.createTestingModule({ imports: [ExportRoutingModule] })
      .overrideGuard(PermissionGuard).useValue({ canActivate: () => true })
      .overrideProvider(ContentService).useValue({ listExportRows: vi.fn(async () => result) }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(new ProblemDetailsFilter('https://api.example.com/problems/'));
    await app.init();
    return request(app.getHttpServer());
  };
  afterEach(async () => { await app?.close(); app = undefined; });

  it('B2#53 (routing): plain GET senses/export reaches the real export handler when catalog is registered first, and UUID detail still works', async () => {
    const http = await start();
    const exported = await http.get('/v1/admin/content/senses/export');
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.headers['content-disposition']).toContain('attachment');
    expect(exported.text).toContain('"\'=HYPERLINK(""x"")"');
    const detail = await http.get(`/v1/admin/content/senses/${id.toUpperCase()}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual({ sense_id: id });
    expect((await http.get('/v1/admin/content/senses/bad-id')).status).toBe(404);
    expect((await http.get('/v1/admin/content/senses/zzzzzzzz-abcd-4abc-8abc-123456789abc')).status).toBe(400);
  });

  it('B2#55 (stream): oversize returns intact Problem Details before attachment headers or CSV bytes', async () => {
    const http = await start({ tooMany: true });
    const response = await http.get('/v1/admin/content/senses/export');
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(JSON.parse(response.text)).toEqual(response.body);
    expect(response.body.type).toBe('https://api.example.com/problems/export-too-large');
  });

  it('export rejects pagination and preserves a single BOM/header across 500-row boundaries', async () => {
    const http = await start({ rows: Array.from({ length: 1_001 }, () => row) });
    expect((await http.get('/v1/admin/content/senses/export?page_size=20')).status).toBe(400);
    const response = await http.get('/v1/admin/content/senses/export');
    expect(response.status).toBe(200);
    expect(response.text.split('\uFEFF')).toHaveLength(2);
    expect(response.text.split('headword,pos,')).toHaveLength(2);
    expect(response.text.split('\r\n')).toHaveLength(1_003);
  });
});
