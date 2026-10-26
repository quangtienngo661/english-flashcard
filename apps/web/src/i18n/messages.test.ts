import en from '../../messages/en.json';
import vi from '../../messages/vi.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const flatVi = flatten(vi as Tree);
const flatEn = flatten(en as Tree);

// Audit 26/10/2026 #9: next-intl prints a plain `{count}` as "262962"; `{count, number}` follows the locale ("262.962",
// "262,962"). Every placeholder that carries a number in the app copy is declared as one.
const NUMERIC = new Set(['count', 'total', 'used', 'limit', 'remaining', 'waiting', 'groups', 'words', 'shown', 'done', 'n', 'needed',
  'target', 'left', 'opened', 'max', 'days', 'seconds']);
/** Keys whose `{groups}` is a list of deck names, not a number. */
const TEXT_ARGS = new Set(['topic.learning', 'word.learning']);

describe('messages', () => {
  it('every numeric placeholder in App is formatted as a number', () => {
    const plain = [...flatten((vi as Tree).App as Tree, 'vi.App'), ...flatten((en as Tree).App as Tree, 'en.App')].flatMap(([key, value]) =>
      [...value.matchAll(/\{(\w+)\}/g)].filter((m) => NUMERIC.has(m[1]) && !TEXT_ARGS.has(key.replace(/^(vi|en)\.App\./, ''))).map((m) => `${key}: {${m[1]}}`),
    );
    expect(plain).toEqual([]);
  });

  it('LP3 vi and en messages have identical keys and no empty values', () => {
    const onlyVi = [...flatVi.keys()].filter((k) => !flatEn.has(k));
    const onlyEn = [...flatEn.keys()].filter((k) => !flatVi.has(k));
    expect({ onlyVi, onlyEn }).toEqual({ onlyVi: [], onlyEn: [] });

    const empty = [...flatVi, ...flatEn].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('LP3 every rich tag is known (landing: br, brMd, brSm, link; app: b, hl, terms, privacy) and every tag is closed', () => {
    const allowed = new Set(['br', 'brMd', 'brSm', 'link', 'b', 'hl', 'terms', 'privacy']);
    const problems: string[] = [];
    for (const [key, value] of [...flatVi, ...flatEn]) {
      const opened = [...value.matchAll(/<([a-zA-Z]+)>/g)].map((m) => m[1]);
      const closed = [...value.matchAll(/<\/([a-zA-Z]+)>/g)].map((m) => m[1]);
      for (const tag of opened) if (!allowed.has(tag)) problems.push(`${key}: unknown <${tag}>`);
      if (opened.join() !== closed.join()) problems.push(`${key}: unbalanced tags`);
    }
    expect(problems).toEqual([]);
  });

  it('the learner app never says "Vui lòng", "please" or "sorry", and uses one-character ellipses (design §7.1)', () => {
    const app = [...flatVi, ...flatEn].filter(([k]) => k.startsWith('App.'));
    expect(app.length).toBeGreaterThan(0);
    expect(app.filter(([, v]) => /vui lòng|please|sorry|\.\.\./i.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('LP30 Faq.items has exactly q1..q4 in both locales', () => {
    expect(Object.keys(vi.Faq.items)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(Object.keys(en.Faq.items)).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});
