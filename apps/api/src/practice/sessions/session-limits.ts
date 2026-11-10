// The maxima of a practice session and the learner's AI count (practice AI count design §3–§4, 09/11/2026). Pure; the session service
// reads the settings and the scope.
import { SCOPE_QUESTIONS_MAX, type AiPlacementSetting, type AppSettings } from '../../settings/index.js';
import { isAiType, type ClozeSource, type QuestionType } from '../practice.types.js';

type Practice = AppSettings['practice'];

/** The most questions a session may have: the fixed maximum, or the scope's word count up to `SCOPE_QUESTIONS_MAX`. */
export function sessionMaxOf(practice: Pick<Practice, 'sessionMaxMode' | 'maxQuestionsPerSession'>, scopeWords: number): number {
  return practice.sessionMaxMode === 'scope_words' ? Math.min(scopeWords, SCOPE_QUESTIONS_MAX) : practice.maxQuestionsPerSession;
}

/** The most AI questions a session of `targetCount` may have: a fixed number, or a share rounded down; never above the session. */
export function aiCapOf(practice: Pick<Practice, 'aiMaxMode' | 'aiMaxFixed' | 'aiMaxPercent'>, targetCount: number): number {
  return practice.aiMaxMode === 'fixed'
    ? Math.min(practice.aiMaxFixed, targetCount)
    : Math.floor((targetCount * practice.aiMaxPercent) / 100);
}

/** The admin's choice wins; only `learner` takes the body's value, `even` when it sent none. */
export function placementOf(setting: AiPlacementSetting, requested: 'even' | 'random' | undefined): 'even' | 'random' {
  return setting === 'learner' ? requested ?? 'even' : setting;
}

/**
 * A session with no AI question: the AI types are dropped; an AI cloze goes with them, while 'own_then_ai' keeps its cloze from saved
 * sentences only ('own').
 */
export function withoutAi(types: QuestionType[], clozeSource: ClozeSource | null):
  { types: QuestionType[]; clozeSource: ClozeSource | null } {
  if (clozeSource === 'own_then_ai') return { types: types.filter((type) => !isAiType(type, 'own')), clozeSource: 'own' };
  const kept = types.filter((type) => !isAiType(type, clozeSource));
  return { types: kept, clozeSource: kept.includes('cloze') ? clozeSource : null };
}

/**
 * The chosen non-AI types, including own-sentence cloze on every plan (đợt cải thiện A C3, changes Bước 7 D11). Under 'own_then_ai'
 * the cloze is in both lists: AI for a word with no saved sentence, a rule question for a word that has one.
 */
export function ruleTypesFor(types: QuestionType[], clozeSource: ClozeSource | null): QuestionType[] {
  return types.filter((type) => !isAiType(type, clozeSource) || (type === 'cloze' && clozeSource === 'own_then_ai'));
}
