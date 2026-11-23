import { describe, expect, it } from 'vitest';
import { corsOriginsFor } from './cors-origins.js';

describe('corsOriginsFor (SEC-01)', () => {
  const prod = {
    corsOrigins: ['https://wordmet.com', 'https://www.wordmet.com', 'https://admin.wordmet.com'],
    adminAppUrl: 'https://admin.wordmet.com',
  };

  it('restricts admin-api host to adminAppUrl only', () => {
    expect(corsOriginsFor('admin-api.wordmet.com', prod)).toEqual(['https://admin.wordmet.com']);
  });

  it('matches admin-api host case-insensitively and strips port', () => {
    expect(corsOriginsFor('ADMIN-API.wordmet.com:443', prod)).toEqual(['https://admin.wordmet.com']);
  });

  it('keeps full corsOrigins on the public api host', () => {
    expect(corsOriginsFor('api.wordmet.com', prod)).toEqual(prod.corsOrigins);
  });

  it('falls back to full corsOrigins when host is missing', () => {
    expect(corsOriginsFor(undefined, prod)).toEqual(prod.corsOrigins);
  });

  it('keeps all local origins on localhost', () => {
    const local = {
      corsOrigins: ['http://localhost:5173', 'http://localhost:3001'],
      adminAppUrl: 'http://localhost:5173',
    };
    expect(corsOriginsFor('localhost:3000', local)).toEqual(['http://localhost:5173', 'http://localhost:3001']);
  });
});
