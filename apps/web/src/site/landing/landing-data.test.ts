// @vitest-environment node
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

  it('the fallback holds the six seeded questions of M8.1, in order', () => {
    expect(FALLBACK_LANDING_DATA.source).toBe('fallback');
    expect(FALLBACK_LANDING_DATA.prices).toEqual(SEEDED);
    expect(FALLBACK_LANDING_DATA.faq).toHaveLength(6);
    expect(FALLBACK_LANDING_DATA.faq.map((item) => item.question)).toEqual([
      'Gói Pro có tự gia hạn không?',
      'Hết Pro thì từ và lịch ôn có mất không?',
      'Dùng trên điện thoại được không?',
      'Mua thêm khi Pro còn hạn thì sao?',
      'Có được hoàn tiền không?',
      'AI có chấm bài của tôi không?',
    ]);
    expect(FALLBACK_LANDING_DATA.faq[0]?.answer).toBe(
      'Không. Bạn trả một lần cho mỗi kỳ 1, 3 hoặc 12 tháng. Hết kỳ, tài khoản về gói Miễn phí và Wordmet không tự trừ tiền.',
    );
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
