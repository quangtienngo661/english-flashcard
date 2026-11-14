import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';
import { fill } from './copy';

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

const landing = (messages: unknown) => flatten((messages as { Landing: Tree }).Landing);

describe('Landing copy (M8.5)', () => {
  it('vi and en carry the same Landing keys, none empty; en keeps the Vietnamese text (L4)', () => {
    const [flatVi, flatEn] = [landing(vi), landing(en)];
    expect([...flatVi.keys()].sort()).toEqual([...flatEn.keys()].sort());
    expect([...flatVi.values(), ...flatEn.values()].filter((v) => v.trim() === '')).toEqual([]);
    expect(en.Landing).toEqual(vi.Landing);
  });

  it('the hero heading is Figma\'s, with "trong câu" in its second line', () => {
    expect(`${vi.Landing.hero.line1} ${vi.Landing.hero.line2}`).toBe('Nhớ từ lâu hơn, dùng từ tự tin trong câu.');
    expect(vi.Landing.hero.line2).toContain(vi.Landing.hero.accent);
  });

  it('no Landing string says "!", "Vui lòng" or "Chưa mở bán", and none names the review boxes ("ngăn", design §3.3)', () => {
    const bad = [...landing(vi)].filter(([, v]) => /!|vui lòng|chưa mở bán|ngăn/i.test(v)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('LA3#16 no Landing string says AI belongs to Pro only, and none promises a Pro trial', () => {
    const flat = [...landing(vi)];
    expect(flat.filter(([, v]) => /\bPro\b.*\bAI\b|\bAI\b.*\bPro\b/.test(v)).map(([k]) => k)).toEqual([]);
    // "Dùng thử câu luyện và tra từ bằng AI" is the Free allowance (launch prep A, design 6.7), not a trial of Pro (R204).
    expect(flat.filter(([, v]) => /dùng thử (gói )?pro|trial/i.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('LR11 the old landing namespaces are gone from both message files', () => {
    const old = ['Hero', 'Cloze', 'Problem', 'Steps', 'Ai', 'Plans', 'Faq', 'FinalCta'];
    expect(old.filter((key) => key in vi || key in en)).toEqual([]);
  });

  it('L2 no waitlist is left: its namespace is gone and the legal pages no longer describe it', () => {
    for (const messages of [vi, en]) {
      expect('Waitlist' in messages).toBe(false);
      // M8.7 adds the Figma chrome around the published text (leads, version line, scope, phone pill name, the two callouts).
      expect(Object.keys(messages.Legal)).toEqual([
        'privacyTitle', 'termsTitle', 'draftNotice', 'effective', 'contents', 'privacyLead', 'termsLead', 'versionLine', 'termsScope',
        'contentsOpen', 'privacyHelpTitle', 'privacyHelpBody', 'termsHelpTitle', 'termsHelpBody',
      ]);
      expect(JSON.stringify(messages.Legal)).not.toMatch(/waitlist|danh sách chờ|thông báo ra mắt|launch notification/i);
    }
  });

  it('the page title is unchanged until the SEO task (M8.8); the English one is translated (UI copy round 2, Q7)', () => {
    expect(vi.Metadata.title).toBe('Wordmet · Học từ vựng tiếng Anh, ghi nhớ và vận dụng');
    expect(en.Metadata.title).toBe('Wordmet · Learn, remember and use English vocabulary');
  });

  it('fill replaces each {name} and leaves unknown ones', () => {
    expect(fill(vi.Landing.plans.perMonthApprox, { price: '66.300 ₫' })).toBe('≈ 66.300 ₫ mỗi tháng');
    expect(fill(vi.Landing.plans.saving, { percent: 16 })).toBe('−16%');
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});
