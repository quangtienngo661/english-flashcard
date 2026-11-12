// @vitest-environment node
import { hits, sources } from '@/styles/scan-src';

// Final review I1: a part of speech printed as JSX text goes through `shownPos`, so the API's "unspecified" never reaches the learner.
// Three lanes each missed this once; the scan catches the next `{x.pos}` printed raw in the learner app.
// AuthShowcase prints its own fixed demo words (never "unspecified").
const ALLOWED = new Set(['features/learner/auth/AuthShowcase.tsx']);

describe('part of speech is printed through shownPos (I1)', () => {
  it('scans real files (control)', () => {
    expect(sources.some((s) => s.file === 'features/learner/review/CardStack.tsx')).toBe(true);
    expect(hits(/shownPos\(/).length).toBeGreaterThan(0);
  });

  it('no raw {….pos} text in the learner app', () => {
    const raw = hits(/(?<![=$])\{[\w.?]+\.pos\}/).filter((at) => at.startsWith('features/learner/') && !ALLOWED.has(at.split(':')[0]!));
    expect(raw).toEqual([]);
  });
});
