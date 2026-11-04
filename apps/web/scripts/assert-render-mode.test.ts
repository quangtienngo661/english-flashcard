import { renderModeProblems } from './assert-render-mode.mjs';

describe('assert-render-mode (launch prep B design §5.4)', () => {
  it('the landing is prerendered and the app is not: no problem', () => {
    expect(renderModeProblems(['/en', '/vi', '/vi/terms'], true)).toEqual([]);
  });

  it('LP2: /vi or /en missing from the prerender manifest is a problem (the landing must be static)', () => {
    expect(renderModeProblems(['/en'], true)).toEqual(['/vi is not prerendered, the landing must be static']);
    expect(renderModeProblems([], false)).toEqual(['/vi is not prerendered, the landing must be static', '/en is not prerendered, the landing must be static']);
  });

  it('/vi/app or /en/app in the manifest is a problem (the app is rendered per request so every page gets its own nonce)', () => {
    expect(renderModeProblems(['/en', '/vi', '/vi/app'], true)).toEqual(['/vi/app is prerendered, the app must be rendered per request']);
    expect(renderModeProblems(['/en', '/vi', '/vi/app', '/en/app'], true)).toHaveLength(2);
  });

  it('every page under /app counts, not only the root', () => {
    expect(renderModeProblems(['/en', '/vi', '/vi/app/groups'], true)).toEqual(['/vi/app/groups is prerendered, the app must be rendered per request']);
  });

  it('a build with the learner app off has no app routes to check, and /vi/apple is not an app route', () => {
    expect(renderModeProblems(['/en', '/vi', '/vi/apple'], false)).toEqual([]);
    expect(renderModeProblems(['/en', '/vi', '/vi/app'], false)).toEqual([]);
  });
});
