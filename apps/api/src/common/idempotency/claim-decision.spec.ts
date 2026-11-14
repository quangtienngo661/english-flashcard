import { describe, expect, it } from 'vitest';
import { decideClaim } from './claim-decision.js';

const now = new Date('2026-10-20T10:00:00Z');
const secondsAgo = (seconds: number) => new Date(now.getTime() - seconds * 1000);
const succeeded = { status: 'succeeded', payloadHash: 'h1', createdAt: secondsAgo(60), responseStatus: 201, responseBody: { id: 'x' } };
const inProgress = (seconds: number) =>
  ({ status: 'in_progress', payloadHash: 'h1', createdAt: secondsAgo(seconds), responseStatus: null, responseBody: null });

describe('decideClaim (C1, B0E1)', () => {
  it.each([
    ['no row → claim', null, { kind: 'claim' }],
    ['succeeded, same hash → replay the stored status and body', succeeded, { kind: 'replay', status: 201, body: { id: 'x' } }],
    ['succeeded, different hash → reject', { ...succeeded, payloadHash: 'h2' }, { kind: 'reject' }],
    ['failed_permanent, same hash → still replays', { ...succeeded, status: 'failed_permanent', responseStatus: 422 },
      { kind: 'replay', status: 422, body: { id: 'x' } }],
    ['in_progress created 10 s ago, lease 30 → conflict, retry after 2 s', inProgress(10), { kind: 'conflict', retryAfterSeconds: 2 }],
    ['in_progress created exactly 30 s ago, lease 30 → abandoned', inProgress(30), { kind: 'abandoned' }],
    ['in_progress created 31 s ago, lease 30 → abandoned', inProgress(31), { kind: 'abandoned' }],
  ])('%s', (_name, row, expected) => {
    expect(decideClaim(row, { payloadHash: 'h1', now, leaseSeconds: 30 })).toEqual(expected);
  });
});
