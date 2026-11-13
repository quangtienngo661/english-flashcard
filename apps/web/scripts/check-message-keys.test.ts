import { readRepoInput, findUnusedKeys } from './check-message-keys.mjs';

const f = (text: string, path = 'a.tsx') => ({ path, text });

describe('check-message-keys', () => {
  it('reports a key no call reaches', () => {
    const r = findUnusedKeys({ messages: { A: { b: 'x', c: 'y' } }, sources: [f(`useTranslations('A'); t('b')`)], allow: [] });
    expect(r).toEqual({ unused: ['A.c'], staleAllow: [] });
  });

  it('marks a nested key through a dotted namespace and a dotted argument', () => {
    const r = findUnusedKeys({ messages: { A: { b: { c: { d: 'x' } } } }, sources: [f(`useTranslations('A.b'); t('c.d')`)], allow: [] });
    expect(r).toEqual({ unused: [], staleAllow: [] });
  });

  it('reads getTranslations with a namespace option', () => {
    const r = findUnusedKeys({
      messages: { Legal: { title: 'x' } },
      sources: [f(`const t = await getTranslations({ locale, namespace: 'Legal' }); t('title')`)],
      allow: [],
    });
    expect(r).toEqual({ unused: [], staleAllow: [] });
  });

  it('does not count a namespace in one file and the key in another', () => {
    const r = findUnusedKeys({
      messages: { A: { b: 'x' } },
      sources: [f(`useTranslations('A')`, 'one.tsx'), f(`t('b')`, 'two.tsx')],
      allow: [],
    });
    expect(r).toEqual({ unused: ['A.b'], staleAllow: [] });
  });

  it('treats built keys as unused until allowed', () => {
    const messages = { A: { noWords: { x: '1', y: '2' } } };
    const sources = [f('useTranslations(\'A\'); t(`noWords.${k}`)')];
    expect(findUnusedKeys({ messages, sources, allow: [] })).toEqual({ unused: ['A.noWords.x', 'A.noWords.y'], staleAllow: [] });
    expect(findUnusedKeys({ messages, sources, allow: [{ key: 'A.noWords.*', why: 'a.tsx:1' }] })).toEqual({ unused: [], staleAllow: [] });
  });

  it('reports an allow entry that matches no key', () => {
    const r = findUnusedKeys({ messages: { A: { b: 'x' } }, sources: [f(`useTranslations('A'); t('b')`)], allow: [{ key: 'A.gone.*', why: 'x' }] });
    expect(r).toEqual({ unused: [], staleAllow: ['A.gone.*'] });
  });

  it('accepts an empty-namespace call with the full key quoted', () => {
    const r = findUnusedKeys({ messages: { A: { b: 'x' } }, sources: [f(`useTranslations(); t("A.b")`)], allow: [] });
    expect(r).toEqual({ unused: [], staleAllow: [] });
  });

  it('handles empty messages', () => {
    expect(findUnusedKeys({ messages: {}, sources: [], allow: [] })).toEqual({ unused: [], staleAllow: [] });
  });

  it('the repo has no unused message key and no stale allow entry', () => {
    const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    expect(findUnusedKeys(readRepoInput(decodeURIComponent(root)))).toEqual({ unused: [], staleAllow: [] });
  });
});
