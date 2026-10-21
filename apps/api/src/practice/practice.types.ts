// The JSON stored in practice_questions (prompt, answer_key, hints, blank); read by the question builder, answers and reports.
//
// Stored answer formats on practice_session_items: answer_raw = the chosen index "0"…"3" for multiple choice, "true" or
// "false" for true/false, the last typed text as sent for typing; answer_normalized = normalizeAnswer of that text for
// typing, else the same as answer_raw; answers_tried = earlier typed texts, oldest first.

export type QuestionType =
  | 'mcq_definition' | 'true_false_definition' | 'type_word'
  // Bước 7 (design §5): cloze is AI-made or from the learner's own sentence (practice_sessions.cloze_source).
  | 'cloze' | 'meaning_in_sentence' | 'mcq_sentence';
export type QuestionSource = 'rule' | 'ai' | 'own_sentence';
export type ClozeSource = 'ai' | 'own';

// Always AI-made; cloze is AI-made only when the session's cloze source is 'ai'.
export const AI_QUESTION_TYPES = ['meaning_in_sentence', 'mcq_sentence'] as const;

export function isAiType(type: QuestionType, clozeSource: ClozeSource | null): boolean {
  return (AI_QUESTION_TYPES as readonly QuestionType[]).includes(type) || (type === 'cloze' && clozeSource === 'ai');
}

// Why an AI question was not made (design §6.5, §7).
export type AiFailure =
  | 'ai-unavailable' | 'quota-exhausted' | 'plan-required' | 'ai-failed' | 'rejected' | 'input-mismatch' | 'word-not-recognized';
export type PromptStyle = 'meaning' | 'sentence';
export type MeaningLanguage = 'vi' | 'en';

export type Prompt =
  | { kind: 'mcq'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null; options: string[] }
  | { kind: 'true_false'; lemma: string; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }
  | { kind: 'type_meaning'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }
  | { kind: 'type_sentence'; sentence: string }
  | { kind: 'cloze'; sentence: string }
  | { kind: 'meaning_in_sentence'; sentence: string; highlight: string; options: string[]; meaning_language: MeaningLanguage }
  | { kind: 'mcq_sentence'; sentence: string; options: string[] };

export type AnswerKey = {
  reveal: { lemma: string; meaning: string; definition_en: string | null };
  asked_private: boolean;
  // Bước 7: the Vietnamese translation of an AI sentence, shown after the answer; absent on Bước 4 rows.
  translation_vi?: string | null;
} & (
  | { kind: 'mcq'; correct_index: number; option_private: boolean[] }
  | { kind: 'true_false'; is_true: boolean; paired_private: boolean }
  // accepted is normalized and includes main.
  | { kind: 'type_word'; main: string; accepted: string[] }
);

export type HintStep = { kind: 'definition' | 'example' | 'meaning' | 'first_letter'; text: string };
// Level 2 as stored by Bước 4 rows; the new question kinds store a HintStep (P2).
export type LegacyLetterHint = { first_letter: string; length: number };

export type Hints = {
  level1: HintStep | null;
  level2: HintStep | LegacyLetterHint | null;
  level3?: HintStep | null;
};

// practice_questions.blank, from maskExample (design 7.4b).
export type Blank = { text: string; base: boolean };
