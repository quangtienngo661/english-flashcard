import { describe, expect, it } from 'vitest';
import { itemView, type ItemWithQuestion } from './session-views.js';

const item = (question: Record<string, unknown>) => ({
  id: 'it-1', round: 1, position: 1, hintLevel: 0, tries: 0,
  question: {
    type: 'cloze', promptStyle: 'sentence', prompt: { kind: 'cloze', sentence: 'We ___ it.' }, source: 'rule',
    hints: { level1: { kind: 'first_letter', text: 'd' }, level2: null },
    answerKey: { kind: 'type_word', main: 'deployed', accepted: ['deployed'], translation_vi: 'Chúng tôi triển khai.', asked_private: false },
    ...question,
  },
}) as unknown as ItemWithQuestion;

describe('itemView (Bước 7)', () => {
  it('B7E55: never the answer key, the translation or a hint text; level 3 is flagged when stored', () => {
    const view = itemView(item({ hints: { level1: { kind: 'first_letter', text: 'd' }, level2: null, level3: { kind: 'meaning', text: 'x' } } }));
    expect(JSON.stringify(view)).not.toMatch(/deployed|Chúng tôi|first_letter/);
    expect(view.hints_available).toEqual({ level1: true, level2: false, level3: true });
    expect(itemView(item({})).hints_available.level3).toBe(false);
  });

  it('design §9.2: reportable for AI questions (a private word too), not for own sentences or private rule questions', () => {
    const privateKey = { kind: 'type_word', main: 'x', accepted: ['x'], asked_private: true };
    expect(itemView(item({ source: 'ai', answerKey: privateKey })).reportable).toBe(true);
    expect(itemView(item({ source: 'own_sentence' })).reportable).toBe(false);
    expect(itemView(item({ source: 'rule', answerKey: privateKey })).reportable).toBe(false);
    expect(itemView(item({ source: 'rule' })).reportable).toBe(true);
  });

  it('learner UI D12 (K/81): private_word says the asked word is the learner\'s own, so the report screen can say the team will see it', () => {
    const privateKey = { kind: 'type_word', main: 'x', accepted: ['x'], asked_private: true };
    expect(itemView(item({ source: 'ai', answerKey: privateKey })).private_word).toBe(true);
    expect(itemView(item({ source: 'ai' })).private_word).toBe(false);
  });
});
