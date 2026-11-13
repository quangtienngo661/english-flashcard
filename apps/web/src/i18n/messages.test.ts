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

const flatVi = flatten(vi as unknown as Tree);
const flatEn = flatten(en as unknown as Tree);

// Audit 26/10/2026 #9: next-intl prints a plain `{count}` as "262962"; `{count, number}` follows the locale ("262.962",
// "262,962"). Every placeholder that carries a number in the app copy is declared as one.
const NUMERIC = new Set(['count', 'total', 'used', 'limit', 'remaining', 'waiting', 'groups', 'words', 'shown', 'done', 'n', 'needed',
  'target', 'left', 'opened', 'max', 'days', 'seconds', 'added', 'already', 'full', 'missing', 'function']);
/** Keys whose `{groups}` is a list of deck names, not a number. */
const TEXT_ARGS = new Set(['topic.learning']);

describe('messages', () => {
  it('every numeric placeholder in App is formatted as a number', () => {
    const plain = [...flatten((vi as unknown as Tree).App as Tree, 'vi.App'), ...flatten((en as unknown as Tree).App as Tree, 'en.App')].flatMap(([key, value]) =>
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

  it('LP3 every rich tag is known (landing: br; app: b, hl, terms, privacy, mail, lv, tp, ps) and every tag is closed', () => {
    // `mail` is the support address link of the order return page (launch prep B design §3.8); `lv`, `tp`, `ps` are the filter
    // values of Tra từ's sentence (giao diện mới M4.5).
    const allowed = new Set(['br', 'b', 'hl', 'terms', 'privacy', 'mail', 'lv', 'tp', 'ps']);
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

  it('P.1 levels, not stages: no vi value says "ngăn", no en value says "stage" or "-day box"', () => {
    // Control: the level names exist, so an empty result means the words are gone, not that nothing was read.
    expect(flatVi.get('App.levels.name')).toContain('Bậc');
    expect([...flatVi].filter(([, v]) => /ngăn/i.test(v)).map(([k]) => k)).toEqual([]);
    expect([...flatEn].filter(([, v]) => /stage|-day box/i.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('M8.4 the public header and footer read Nav; Landing.nav and Landing.footer are gone', () => {
    expect(vi.Nav).toEqual({
      skipToContent: 'Chuyển đến nội dung chính',
      login: 'Đăng nhập',
      signup: 'Đăng ký',
      groups: 'Nhóm từ',
      howTo: 'Cách học',
      pricing: 'Giá',
      theme: 'Giao diện',
      light: 'Sáng',
      dark: 'Tối',
      themeToLight: 'Chuyển sang giao diện sáng',
      themeToDark: 'Chuyển sang giao diện tối',
      motion: 'Chuyển động',
      motionOn: 'Bật',
      motionOff: 'Tắt',
      motionDevice: 'Theo cài đặt máy',
    });
    for (const messages of [vi, en]) {
      expect('nav' in messages.Landing).toBe(false);
      expect('footer' in messages.Landing).toBe(false);
    }
  });
});
