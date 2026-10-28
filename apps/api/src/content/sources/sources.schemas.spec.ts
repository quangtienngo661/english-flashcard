import { describe, expect, it } from 'vitest';
import { createSourceSchema, sourceParamsSchema, updateSourceSchema } from './sources.schemas.js';

describe('createSourceSchema (unchanged by the edit work)', () => {
  it('fills the defaults for a name-only body', () => {
    expect(createSourceSchema.parse({ name: ' CEFR-J ' })).toEqual({
      kind: 'third_party', name: 'CEFR-J', version: '', url: null, license: '', attribution: '', display_priority: 100,
    });
  });
});

describe('updateSourceSchema', () => {
  it('keeps only what was sent: no default fills a missing key', () => {
    expect(updateSourceSchema.parse({ name: ' New ' })).toEqual({ name: 'New' });
    expect(updateSourceSchema.parse({ display_priority: 5 })).toEqual({ display_priority: 5 });
  });

  it('accepts every editable field at once, trimming text', () => {
    expect(updateSourceSchema.parse({
      name: ' A ', version: ' 2 ', url: 'https://example.com/x', license: ' MIT ', attribution: ' by me ', display_priority: -3,
    })).toEqual({ name: 'A', version: '2', url: 'https://example.com/x', license: 'MIT', attribution: 'by me', display_priority: -3 });
  });

  it('url: null clears the link, and version, license and attribution can be blanked', () => {
    expect(updateSourceSchema.parse({ url: null, version: ' ', license: '', attribution: '\t' }))
      .toEqual({ url: null, version: '', license: '', attribution: '' });
  });

  it('empty body → refused (at least one key)', () => {
    expect(updateSourceSchema.safeParse({}).success).toBe(false);
  });

  it('kind is not editable, and unknown keys are refused', () => {
    expect(updateSourceSchema.safeParse({ kind: 'owner' }).success).toBe(false);
    expect(updateSourceSchema.safeParse({ kind: 'third_party', name: 'x' }).success).toBe(false);
    expect(updateSourceSchema.safeParse({ name: 'x', id: 'y' }).success).toBe(false);
  });

  it('uses the create validators: blank name, non-http url, fractional or out-of-range priority are refused', () => {
    for (const body of [
      { name: '  ' }, { name: '' }, { url: 'javascript:alert(1)' }, { url: 'ftp://example.com' }, { url: 'not a url' },
      { display_priority: 1.5 }, { display_priority: 2_147_483_648 }, { display_priority: -2_147_483_649 },
      { name: 1 }, { version: null }, { license: null }, { attribution: null }, { display_priority: null },
    ]) {
      expect(updateSourceSchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
    }
    expect(updateSourceSchema.safeParse({ display_priority: 2_147_483_647 }).success).toBe(true);
    expect(updateSourceSchema.safeParse({ display_priority: -2_147_483_648 }).success).toBe(true);
    expect(updateSourceSchema.safeParse({ url: 'http://example.com' }).success).toBe(true);
  });
});

describe('sourceParamsSchema', () => {
  it('takes a uuid and lower-cases it', () => {
    const id = '00000000-0000-4000-8000-0000000000AB';
    expect(sourceParamsSchema.parse({ id })).toEqual({ id: id.toLowerCase() });
  });

  it('refuses anything else', () => {
    expect(sourceParamsSchema.safeParse({ id: 'nope' }).success).toBe(false);
    expect(sourceParamsSchema.safeParse({}).success).toBe(false);
    expect(sourceParamsSchema.safeParse({ id: '00000000-0000-4000-8000-000000000001', extra: 1 }).success).toBe(false);
  });
});
