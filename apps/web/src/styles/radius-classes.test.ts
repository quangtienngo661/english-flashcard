// @vitest-environment node
import { hits } from './scan-src';

// Part 10 P.3: radius classes name an element role (key, control, row, card, dialog, pill), never the old sizes.
describe('radius classes (P.3)', () => {
  it('scans real files (control)', () => {
    expect(hits(/rounded-wm-(?:key|control|row|card|dialog|pill)/).length).toBeGreaterThan(200);
  });

  it('no size-named wm radius left', () => {
    expect(hits(/rounded(?:-[tblr])?-wm-(?:xs|sm|md|lg|xl|2xl|button|modal)(?![\w-])/)).toEqual([]);
  });

  it('no Tailwind default or old-theme radius class left', () => {
    expect(hits(/(?<![\w-])rounded(?:-[tblr])?-(?:xs|sm|lg|control|card|inner)(?![\w-])/)).toEqual([]);
  });

  it('no arbitrary radius', () => {
    expect(hits(/rounded(?:-[tblr])?-\[/)).toEqual([]);
  });
});
