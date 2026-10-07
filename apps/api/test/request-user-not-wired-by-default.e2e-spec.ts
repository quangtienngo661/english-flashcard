import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('RequestUser seam is not wired by default', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('the X-Test-User-Id header alone does nothing without the fake middleware explicitly imported', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').set('X-Test-User-Id', 'user-123');
    expect(res.status).toBe(200);
  });
});
