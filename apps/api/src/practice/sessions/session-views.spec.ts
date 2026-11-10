import { describe, expect, it } from 'vitest';
import type { PracticeSession } from '../../generated/prisma/client.js';
import { itemView, sessionView, type ItemWithQuestion } from './session-views.js';

const item = (question: Record<string, unknown>) => ({
  id: 'it-1', round: 1, position: 1, hintLevel: 0, tries: 0,
  question: {
    type: 'cloze', promptStyle: 'sentence', prompt: { kind: 'cloze', sentence: 'We ___ it.' }, source: 'rule',
    hints: { level1: { kind: 'first_letter', text: 'd' }, level2: null },
    answerKey: { kind: 'type_word', main: 'deployed', accepted: ['deployed'], translation_vi: 'Chúng tôi triển khai.', asked_private: false },
    ...question,
  },
}) as unknown as ItemWithQuestion;

const now = new Date('2026-11-09T03:00:00Z');
const sessionRow = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: 'sess-1', userId: 'u-1', kind: 'practice', source: 'group', groupId: 'g-1', groupFilter: 'all', sort: 'queue',
  types: ['mcq_definition', 'cloze'], promptStyle: 'mixed', targetCount: 10, senseIds: ['s1', 's2'], status: 'active', continued: null,
  pendingNotice: null, startedAt: now, lastActivityAt: now, endedAt: null, clozeSource: 'ai', aiPlanned: 3, aiSenseIds: ['s2'],
  pendingAiRequestId: null, aiStopped: null, aiNoticeShown: false, aiPlacement: null, ...overrides,
});

describe('sessionView', () => {
  it('ai_placement (09/11/2026): the row value, null for a session started without ai_count', () => {
    expect(sessionView(sessionRow({ aiPlacement: 'random' }), []).ai_placement).toBe('random');
    expect(sessionView(sessionRow({ aiPlacement: null }), []).ai_placement).toBeNull();
  });
});

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

  it('ai says whether this very question was written by AI, whatever the session\'s cloze source is', () => {
    expect(itemView(item({ source: 'ai' })).ai).toBe(true);
    expect(itemView(item({ source: 'own_sentence' })).ai).toBe(false);
    expect(itemView(item({ source: 'rule' })).ai).toBe(false);
  });

  it('learner UI D12 (K/81): private_word says the asked word is the learner\'s own, so the report screen can say the team will see it', () => {
    const privateKey = { kind: 'type_word', main: 'x', accepted: ['x'], asked_private: true };
    expect(itemView(item({ source: 'ai', answerKey: privateKey })).private_word).toBe(true);
    expect(itemView(item({ source: 'ai' })).private_word).toBe(false);
  });
});

describe('sessionView (giao diện mới M5.1, QR2)', () => {
  const row = { id: 's1', kind: 'practice', source: 'today', groupId: null, groupFilter: null, sort: 'queue', types: [], promptStyle: 'mixed',
    targetCount: 20, status: 'active', senseIds: ['a', 'b', 'c'], aiPlanned: 0, clozeSource: null } as unknown as PracticeSession;

  it('after 2 correct and 1 wrong answers the view counts correct 2, wrong 1; unanswered and void count nowhere', () => {
    const view = sessionView(row, [
      { round: 1, result: 'correct' }, { round: 1, result: 'wrong' }, { round: 1, result: 'correct' },
      { round: 1, result: null }, { round: 1, result: 'void' },
    ]);
    expect(view).toMatchObject({ correct: 2, wrong: 1, asked: 4 });
  });

  it('a session with no items counts 0 and 0', () => {
    expect(sessionView(row, [])).toMatchObject({ correct: 0, wrong: 0 });
  });
});
