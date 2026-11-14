// @vitest-environment node
import { readFileSync } from 'node:fs';
import { FALLBACK_LANDING_DATA } from './landing-data.fallback';
import { landingData, parseLandingData } from './landing-data';

// Giao diện mới M8.3: the landing reads prices and FAQ only from the JSON `next build` inlined (WORDMET_LANDING_DATA), else the fallback.
const SEEDED = { '1': 79000, '3': 199000, '12': 599000 };

describe('landing data (M8.3)', () => {
  it('no data at all gives the fallback with the seeded prices', () => {
    const data = parseLandingData(undefined);
    expect(data.source).toBe('fallback');
    expect(data.prices).toEqual(SEEDED);
  });

  it.each([[''], ['{'], ['null'], ['[]'], ['{"prices":{"1":79000,"3":199000},"faq":[]}'], ['{"prices":{"1":79000,"3":199000,"12":599000},"faq":[{"question":"Q?"}]}']])(
    '%j gives the fallback',
    (raw) => {
      expect(parseLandingData(raw)).toEqual(FALLBACK_LANDING_DATA);
    },
  );

  it('a valid string is the API data, FAQ order kept', () => {
    const raw = JSON.stringify({
      prices: { '1': 89000, '3': 240000, '12': 699000 },
      faq: [
        { question: 'Câu B?', answer: 'Trả lời B.' },
        { question: 'Câu A?', answer: 'Trả lời A.' },
      ],
    });
    expect(parseLandingData(raw)).toEqual({
      prices: { '1': 89000, '3': 240000, '12': 699000 },
      faq: [
        { question: 'Câu B?', answer: 'Trả lời B.' },
        { question: 'Câu A?', answer: 'Trả lời A.' },
      ],
      source: 'api',
    });
  });

  it('an empty published FAQ stays empty (the home page then has no FAQ section)', () => {
    expect(parseLandingData('{"prices":{"1":79000,"3":199000,"12":599000},"faq":[]}')).toEqual({ prices: SEEDED, faq: [], source: 'api' });
  });

  it('the fallback holds the six seeded questions (UI copy round 2), in order', () => {
    expect(FALLBACK_LANDING_DATA.source).toBe('fallback');
    expect(FALLBACK_LANDING_DATA.prices).toEqual(SEEDED);
    expect(FALLBACK_LANDING_DATA.faq).toHaveLength(6);
    expect(FALLBACK_LANDING_DATA.faq.map((item) => item.question)).toEqual([
      'Wordmet giúp mình học từ vựng thế nào?',
      'Học rồi vẫn quên, hoặc biết nghĩa mà không dùng được thì sao?',
      'Mình nên bắt đầu từ đâu?',
      'AI giúp gì, và có đáng tin không?',
      'Gói Miễn phí và Pro khác nhau thế nào?',
      'Nghĩa và câu ví dụ trong Wordmet lấy từ đâu?',
    ]);
    expect(FALLBACK_LANDING_DATA.faq[0]?.answer).toBe(
      'Wordmet lo phần ghi nhớ để bạn dành thời gian dùng từ. Bạn lưu từ mới gặp, Wordmet tra sẵn nghĩa, phiên âm, câu ví dụ và xếp lịch ôn cho từng từ. Mỗi ngày bạn ôn những từ đến hạn và luyện chúng trong câu.',
    );
  });

  it('keeps the fallback equal to the FAQ the newest seed migration writes (question and answer, in order)', () => {
    const sql = readFileSync(new URL('../../../../api/prisma/migrations/20261114180000_landing_faq_copy/migration.sql', import.meta.url), 'utf8');
    const seeded = [...sql.matchAll(/\((\d+), '([^']*)', '([^']*)', true/g)].map((m) => ({ question: m[2], answer: m[3] }));
    // Control: the migration was read and parsed, so an equal result is a real comparison.
    expect(seeded).toHaveLength(6);
    expect(FALLBACK_LANDING_DATA.faq).toEqual(seeded);
    // Payment questions live on the Plans page now (decision Q12).
    expect(FALLBACK_LANDING_DATA.faq.filter((item) => /hoàn tiền|gia hạn|thanh toán/.test(item.question + item.answer))).toEqual([]);
  });

  describe('landingData() reads process.env.WORDMET_LANDING_DATA', () => {
    const before = process.env.WORDMET_LANDING_DATA;
    afterEach(() => {
      if (before === undefined) delete process.env.WORDMET_LANDING_DATA;
      else process.env.WORDMET_LANDING_DATA = before;
    });

    it('unset: fallback', () => {
      delete process.env.WORDMET_LANDING_DATA;
      expect(landingData().source).toBe('fallback');
    });

    it('set to valid JSON: api', () => {
      process.env.WORDMET_LANDING_DATA = '{"prices":{"1":1000,"3":2000,"12":3000},"faq":[]}';
      expect(landingData()).toEqual({ prices: { '1': 1000, '3': 2000, '12': 3000 }, faq: [], source: 'api' });
    });
  });
});
