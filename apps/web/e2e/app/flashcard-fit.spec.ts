import { expect, test } from '@playwright/test';
import { signedInAs, type MockHandler } from '../support/mock-api';

const G = '22222222-2222-4222-8222-222222222222';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const WORDS = ['anthropologist', 'cat', 'internationalization', 'electroencephalograph'];
const card = (n: number, lemma: string) => ({
  item_id: uuid(n), sense_id: uuid(100 + n), level: 1, due_date: '2026-10-20', priority: false, section: 'due',
  content: {
    sense_id: uuid(100 + n), scope: 'catalog', lemma, pos: 'noun', level: 'B1', context_label: null,
    meaning: { text: `nghĩa ${lemma}`, language: 'vi', translation_missing: false }, definition_en: null, examples: [], form_of: null, sentences: [],
  },
});
const summary = { id: G, name: 'Test', version: 1, total: 4, today: { priority: 0, due: 4, new: 0 }, cells: [], backlog: 0, available: { due: 4, new: 0 } };

// jsdom has no layout, so this is the only test that can see a long word stretch the card (the track grew to the word's own width).
test('a long word stays on one line, shrinks to the card and does not widen it', async ({ page }) => {
  const handlers: Record<string, MockHandler> = {
    'GET /v1/groups': () => ({ json: { items: [summary] } }),
    [`GET /v1/groups/${G}`]: () => ({ json: { id: G, name: 'Test', version: 1, item_count: 4, removable_items: 0, created_at: '2026-10-01T03:00:00Z', updated_at: '2026-10-01T03:00:00Z' } }),
    [`GET /v1/groups/${G}/queue`]: () => ({ json: { cards: WORDS.map((word, i) => card(i + 1, word)) } }),
    'POST /v1/reviews': () => ({ json: { item_id: uuid(1), level: 2, due_date: '2026-10-23', priority: false } }),
  };
  for (const word of WORDS) handlers[`GET /v1/words/${word}`] = () => ({ json: { lemma: word, inflections: [], sections: [] } });
  await signedInAs(page, 'free', handlers);
  await page.goto(`/vi/app/review?group=${G}`);
  await page.locator('[data-fit-word]').first().waitFor();
  await page.waitForTimeout(600);
  const measure = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-fit-word]')].map((el) => {
    const card = el.closest('.cstack-card') as HTMLElement;
    const size = parseFloat(getComputedStyle(el).fontSize);
    return { word: el.textContent, size, oneLine: el.getBoundingClientRect().height < size * 2, cardWidth: card.offsetWidth, viewport: window.innerWidth, textWidth: el.scrollWidth, boxWidth: el.parentElement!.clientWidth };
  }));
  for (const step of ['front', 'after rating']) {
    if (step === 'after rating') {
      await page.keyboard.press('Space');
      await page.keyboard.press('1');
      await page.waitForTimeout(700);
    }
    const words = await measure();
    expect(words.length, step).toBeGreaterThan(1);
    for (const m of words) {
      expect(m.oneLine, `${m.word} ${step}`).toBe(true);
      expect(m.cardWidth, `${m.word} ${step}`).toBeLessThanOrEqual(m.viewport);
      expect(m.textWidth, `${m.word} ${step}`).toBeLessThanOrEqual(m.boxWidth + 1);
    }
    // The longest word is smaller than a short one: it shrank instead of widening the card.
    const sizes = new Map(words.map((m) => [m.word, m.size]));
    expect(sizes.get('electroencephalograph') ?? 0).toBeLessThan(sizes.get('cat') ?? sizes.get('electroencephalograph')!);
  }
});
