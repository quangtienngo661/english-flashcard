import { Controller, Get, INestApplication, Module, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { operationIdMiddleware } from '../src/common/logging/operation-id.middleware.js';
import { decodePageToken } from '../src/common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../src/common/problem-details/problem-details.exception.js';
import { ProblemDetailsFilter } from '../src/common/problem-details/problem-details.filter.js';

@Controller('diagnostics')
class DiagnosticsController {
  @Get('paginated')
  list(@Query('page_token') pageToken?: string) {
    if (pageToken !== undefined) {
      const cursor = decodePageToken(pageToken);
      if (cursor === null) {
        throw new ProblemDetailsException({ status: 400, title: 'Malformed page_token' });
      }
    }
    return { items: [], next_page_token: null };
  }
}

@Module({ controllers: [DiagnosticsController] })
class DiagnosticsModule {}

describe('pagination (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DiagnosticsModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(operationIdMiddleware);
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('a malformed page_token returns 400 Problem Details, never 500', async () => {
    const res = await request(app.getHttpServer()).get('/v1/diagnostics/paginated?page_token=not-real');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });
});
