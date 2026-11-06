import { describe, expect, it } from 'vitest';
import type { PracticeSense } from '../../content/index.js';
import { deploy } from '../testing/ai-senses.js';
import { pickSessionWords } from './session-words.js';

/** An adjective sense the way Content's practice read returns it. */
const adjective = (lemma: string, gloss: string | null, data: Partial<PracticeSense> = {}) =>
  deploy({ lemma, gloss_vi: gloss, pos: 'adjective', inflections: [], ...data });

describe('pickSessionWords (design §5.1)', () => {
  const vital = adjective('vital', 'thiết yếu');

  it('no other word → words [] and senses []', () => {
    expect(pickSessionWords(vital, [])).toEqual({ words: [], senses: [] });
  });

  it('leaves out the asked sense and every sense of the asked lemma, ignoring case (fair, Fair)', () => {
    const asked = adjective('fair', 'công bằng');
    const sameLemma = adjective('Fair', 'hội chợ');
    const crucial = adjective('crucial', 'quan trọng');
    const picked = pickSessionWords(asked, [asked, sameLemma, crucial]);
    expect(picked.words).toEqual([{ word: 'crucial', meaning_vi: 'quan trọng' }]);
    expect(picked.senses).toEqual([{ senseId: crucial.sense_id, scope: 'catalog' }]);
  });

  it('keeps the same part of speech and words with none; asked word with none keeps all', () => {
    const crucial = adjective('crucial', 'quan trọng');
    const habit = adjective('habit', 'thói quen', { pos: 'noun' });
    const loose = adjective('whatever', 'sao cũng được', { pos: null });
    expect(pickSessionWords(vital, [crucial, habit, loose]).words.map((w) => w.word)).toEqual(['crucial', 'whatever']);
    const unspecified = adjective('vital', 'thiết yếu', { pos: null });
    expect(pickSessionWords(unspecified, [crucial, habit, loose]).words.map((w) => w.word)).toEqual(['crucial', 'habit', 'whatever']);
  });

  it('one entry per lemma and meaning; senses lists every sense sent, with its scope', () => {
    const critical1 = adjective('critical', 'quan trọng');
    const critical2 = adjective('critical', 'hay chỉ trích');
    const again = adjective('critical', 'quan trọng', { scope: 'private' });
    const picked = pickSessionWords(vital, [critical1, critical2, again]);
    expect(picked.words).toEqual([
      { word: 'critical', meaning_vi: 'quan trọng' }, { word: 'critical', meaning_vi: 'hay chỉ trích' },
    ]);
    // The repeated pair is sent once, but its private sense is still a sense whose word was sent.
    expect(picked.senses).toEqual([
      { senseId: critical1.sense_id, scope: 'catalog' }, { senseId: critical2.sense_id, scope: 'catalog' },
      { senseId: again.sense_id, scope: 'private' },
    ]);
  });

  it('a private sense carries scope private', () => {
    const mine = adjective('crucial', 'quan trọng', { scope: 'private' });
    expect(pickSessionWords(vital, [mine]).senses).toEqual([{ senseId: mine.sense_id, scope: 'private' }]);
  });

  it('meaning_vi is null when the sense has no gloss_vi', () => {
    expect(pickSessionWords(vital, [adjective('crucial', null)]).words).toEqual([{ word: 'crucial', meaning_vi: null }]);
    expect(pickSessionWords(vital, [adjective('crucial', '   ')]).words).toEqual([{ word: 'crucial', meaning_vi: null }]);
  });

  it('stops at 99 entries', () => {
    const many = Array.from({ length: 120 }, (_, index) => adjective(`word${index}`, `nghĩa ${index}`));
    const picked = pickSessionWords(vital, many);
    expect(picked.words).toHaveLength(99);
    expect(picked.senses).toHaveLength(99);
    expect(picked.words[98].word).toBe('word98');
  });
});
