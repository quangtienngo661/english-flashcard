import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';

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

const landing = (messages: unknown) => (messages as { Landing?: Tree }).Landing;

describe('Landing copy', () => {
  it('vi and en carry the same Landing keys, none empty (D3)', () => {
    expect(landing(vi)).toBeDefined();
    const flatVi = flatten(landing(vi) as Tree);
    const flatEn = flatten(landing(en) as Tree);
    expect([...flatVi.keys()].sort()).toEqual([...flatEn.keys()].sort());
    expect([...flatVi.values(), ...flatEn.values()].filter((v) => v.trim() === '')).toEqual([]);
  });

  it('the hero heading is the approved two lines', () => {
    const hero = (landing(vi) as { hero: { line1: string; line2: string } }).hero;
    expect(hero.line1).toBe('Học từ vựng tiếng Anh,');
    expect(hero.line2).toBe('ghi nhớ và vận dụng');
  });

  it('no Landing string says "!", "Vui lòng" or "Chưa mở bán"', () => {
    const bad = [...flatten(landing(vi) as Tree)].filter(([, v]) => /!|vui lòng|chưa mở bán/i.test(v)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('LR11 the old landing namespaces are gone from both message files', () => {
    const old = ['Hero', 'Cloze', 'Problem', 'Steps', 'Ai', 'Plans', 'Faq', 'FinalCta'];
    expect(old.filter((key) => key in vi || key in en)).toEqual([]);
  });

  it('L2 no waitlist is left: its namespace is gone and the legal pages no longer describe it', () => {
    for (const messages of [vi, en]) {
      expect('Waitlist' in messages).toBe(false);
      expect(Object.keys(messages.Legal)).toEqual(['privacyTitle', 'termsTitle', 'draftNotice', 'effective']);
      expect(JSON.stringify(messages.Legal)).not.toMatch(/waitlist|danh sách chờ|thông báo ra mắt|launch notification/i);
    }
  });

  it('the page title is the approved one', () => {
    expect(vi.Metadata.title).toBe('Wordmet · Học từ vựng tiếng Anh, ghi nhớ và vận dụng');
  });
});
