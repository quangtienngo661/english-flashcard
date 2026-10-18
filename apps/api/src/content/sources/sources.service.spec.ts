import { describe, expect, it } from 'vitest';
import { isSourceComplete, type SourceView } from './sources.service.js';

const source: SourceView = {
  id: '00000000-0000-4000-8000-000000000002', kind: 'third_party', name: 'CEFR-J',
  version: '1.5', url: null, license: 'test license', attribution: '', display_priority: 10,
};

describe('source completeness', () => {
  it('owner sources are complete without a version or license', () => {
    expect(isSourceComplete({ ...source, kind: 'owner', version: '', license: '' })).toBe(true);
  });

  it('third-party sources require both a non-blank version and license', () => {
    expect(isSourceComplete(source)).toBe(true);
    expect(isSourceComplete({ ...source, version: ' 1.5 ', license: ' test license ' })).toBe(true);
    for (const blank of ['', ' ', '\t\n']) {
      expect(isSourceComplete({ ...source, version: blank })).toBe(false);
      expect(isSourceComplete({ ...source, license: blank })).toBe(false);
      expect(isSourceComplete({ ...source, version: blank, license: blank })).toBe(false);
    }
  });
});
