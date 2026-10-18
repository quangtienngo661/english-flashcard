// The JSON stored in practice_questions (prompt, answer_key, hints, blank); read by the question builder, answers and reports.
//
// Stored answer formats on practice_session_items: answer_raw = the chosen index "0"…"3" for multiple choice, "true" or
// "false" for true/false, the last typed text as sent for typing; answer_normalized = normalizeAnswer of that text for
// typing, else the same as answer_raw; answers_tried = earlier typed texts, oldest first.

export type QuestionType = 'mcq_definition' | 'true_false_definition' | 'type_word';
export type PromptStyle = 'meaning' | 'sentence';
export type MeaningLanguage = 'vi' | 'en';

export type Prompt =
  | { kind: 'mcq'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null; options: string[] }
  | { kind: 'true_false'; lemma: string; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }
  | { kind: 'type_meaning'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }
  | { kind: 'type_sentence'; sentence: string };

export type AnswerKey = {
  reveal: { lemma: string; meaning: string; definition_en: string | null };
  asked_private: boolean;
} & (
  | { kind: 'mcq'; correct_index: number; option_private: boolean[] }
  | { kind: 'true_false'; is_true: boolean; paired_private: boolean }
  // accepted is normalized and includes main.
  | { kind: 'type_word'; main: string; accepted: string[] }
);

export type Hints = {
  level1: { kind: 'definition' | 'example' | 'meaning'; text: string } | null;
  level2: { first_letter: string; length: number } | null;
};

// practice_questions.blank, from maskExample (design 7.4b).
export type Blank = { text: string; base: boolean };
