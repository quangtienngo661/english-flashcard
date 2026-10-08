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

describe('messages', () => {
  it('LP3 vi and en messages have identical keys and no empty values', () => {
    const onlyVi = [...flatVi.keys()].filter((k) => !flatEn.has(k));
    const onlyEn = [...flatEn.keys()].filter((k) => !flatVi.has(k));
    expect({ onlyVi, onlyEn }).toEqual({ onlyVi: [], onlyEn: [] });

    const empty = [...flatVi, ...flatEn].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('LP3 every rich break tag is one of br, brMd, brSm and every tag is closed', () => {
    const allowed = new Set(['br', 'brMd', 'brSm', 'link']);
    const problems: string[] = [];
    for (const [key, value] of [...flatVi, ...flatEn]) {
      const opened = [...value.matchAll(/<([a-zA-Z]+)>/g)].map((m) => m[1]);
      const closed = [...value.matchAll(/<\/([a-zA-Z]+)>/g)].map((m) => m[1]);
      for (const tag of opened) if (!allowed.has(tag)) problems.push(`${key}: unknown <${tag}>`);
      if (opened.join() !== closed.join()) problems.push(`${key}: unbalanced tags`);
    }
    expect(problems).toEqual([]);
  });

  it('LP30 Faq.items has exactly q1..q4 in both locales', () => {
    expect(Object.keys(vi.Faq.items)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(Object.keys(en.Faq.items)).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});
