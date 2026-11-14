import { describe, expect, it } from 'vitest';
import { parseLocale, safeNext, toLearnerApp } from './learner-redirect.js';

const BASE = 'http://localhost:3001';

describe('safeNext (Review Focus 2)', () => {
  it.each([
    ['//evil.example'], ['https://evil.example/vi/app'], ['/fr/app'], ['/vi/apps'], ['/vi/app/../../x'], ['/vi/app/%2e%2e/x'],
    ['/vi/app/%2E%2E/x'], ['/\\evil.example'], ['/vi'], ['/'], [''], [undefined], [42], ['javascript:alert(1)'], ['/vi/app/../app2'],
    ['http://localhost:3001.evil.example/vi/app'], ['http://evil.example@localhost:3001/vi/app'.replace('localhost:3001', 'evil.example')],
  ])('%j → /vi/app', (raw) => {
    expect(safeNext(raw, 'vi', BASE)).toBe('/vi/app');
  });

  it('falls back to the locale it was given', () => {
    expect(safeNext('//evil.example', 'en', BASE)).toBe('/en/app');
  });

  it.each([
    ['/vi/app'], ['/en/app/groups'], ['/vi/app/word?id=1#x'], ['/vi/app?x=1'], ['/vi/app/'], ['http://localhost:3001/vi/app/lookup'],
  ])('%s is kept', (raw) => {
    const kept = safeNext(raw, 'vi', BASE);
    expect(kept.startsWith('/')).toBe(true);
    expect(kept).toBe(new URL(raw, BASE).pathname + new URL(raw, BASE).search + new URL(raw, BASE).hash);
  });
});

describe('toLearnerApp (P7, P8)', () => {
  it('is absolute and on the learner origin', () => {
    expect(toLearnerApp(BASE, '/vi/app/login', { error: 'google-failed' })).toBe('http://localhost:3001/vi/app/login?error=google-failed');
  });

  it('adds a parameter to a path that already has a query, before the fragment', () => {
    expect(toLearnerApp(BASE, '/vi/app/word?id=1#x', { signed_in: 'google' })).toBe('http://localhost:3001/vi/app/word?id=1&signed_in=google#x');
  });

  it('a value that looks like a path or contains & stays one value', () => {
    const url = new URL(toLearnerApp(BASE, '/vi/app', { error: 'a&b=c' }));
    expect(url.searchParams.get('error')).toBe('a&b=c');
  });
});

describe('parseLocale', () => {
  it.each([['en', 'en'], ['vi', 'vi'], ['fr', 'vi'], [undefined, 'vi'], ['EN', 'vi']])('%j → %s', (raw, expected) => {
    expect(parseLocale(raw)).toBe(expected);
  });
});
