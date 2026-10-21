// The stored shape of the Bước 7 question kinds (design §7.8) and their hints (design §8). Pure; the generator supplies checked
// AI output and the picks it sent.
import type { CandidateSense, MaskedExample, PracticeSense } from '../../content/index.js';
import { normalizeAnswer } from '../grading/normalize.js';
import type { HintStep, Hints } from '../practice.types.js';
import { shuffle } from '../questions/distractors.js';
import type { BuiltQuestion } from '../questions/question-builder.service.js';
import type { McqForm } from './ai-checks.js';

type NativeLanguage = 'vi' | 'en';

/** Checked gateway output with what Practice sent alongside it. */
export type AiQuestionInput =
  | { type: 'cloze'; result: { sentence: string; accepted_answers: string[]; translation_vi: string } }
  | { type: 'meaning_in_sentence'; result: { sentence: string; word_in_sentence: string; translation_vi: string };
    wrong: CandidateSense[] }
  | { type: 'mcq_sentence'; result: { sentence: string; distractors: string[]; translation_vi: string }; form: McqForm };

const normalizedSet = (texts: string[]) => [...new Set(texts.map(normalizeAnswer))];

function shortDefinition(s: PracticeSense, maxDefinitionChars: number): string | null {
  return s.definition_en !== null && [...s.definition_en].length <= maxDefinitionChars ? s.definition_en : null;
}

/**
 * Cloze hints (design §8): first letter (no letter count), English definition, Vietnamese meaning for a `vi` learner; a
 * missing level lets the next one move up.
 */
function clozeHints(s: PracticeSense, main: string, nativeLanguage: NativeLanguage, maxDefinitionChars: number): Hints {
  const definition = shortDefinition(s, maxDefinitionChars);
  const steps: HintStep[] = [
    { kind: 'first_letter', text: [...main][0] ?? '' },
    ...(definition !== null ? [{ kind: 'definition' as const, text: definition }] : []),
    ...(nativeLanguage === 'vi' && s.gloss_vi !== null ? [{ kind: 'meaning' as const, text: s.gloss_vi }] : []),
  ];
  return { level1: steps[0] ?? null, level2: steps[1] ?? null, level3: steps[2] ?? null };
}

/** The two choice kinds: the right sense's English definition only (design §8). */
function choiceHints(s: PracticeSense, maxDefinitionChars: number): Hints {
  const definition = shortDefinition(s, maxDefinitionChars);
  return { level1: definition !== null ? { kind: 'definition', text: definition } : null, level2: null };
}

const baseKey = (s: PracticeSense) => ({
  reveal: { lemma: s.lemma, meaning: s.meaning.text, definition_en: s.definition_en }, asked_private: s.scope === 'private',
});

export function aiQuestion(input: AiQuestionInput, s: PracticeSense, nativeLanguage: NativeLanguage, maxDefinitionChars: number,
  random: () => number): BuiltQuestion {
  const { result } = input;
  if (input.type === 'cloze') {
    const main = input.result.accepted_answers[0];
    return {
      type: 'cloze', promptStyle: 'sentence', prompt: { kind: 'cloze', sentence: result.sentence },
      answerKey: {
        kind: 'type_word', ...baseKey(s), main, accepted: normalizedSet(input.result.accepted_answers),
        translation_vi: result.translation_vi,
      },
      hints: clozeHints(s, main, nativeLanguage, maxDefinitionChars),
      blank: { text: main, base: [s.lemma, ...s.variants].includes(main) }, distractorSenseIds: [],
    };
  }
  if (input.type === 'meaning_in_sentence') {
    const options: Array<PracticeSense | CandidateSense> = shuffle([s, ...input.wrong], random);
    return {
      type: 'meaning_in_sentence', promptStyle: 'sentence',
      prompt: {
        kind: 'meaning_in_sentence', sentence: result.sentence, highlight: input.result.word_in_sentence,
        options: options.map((o) => o.meaning.text), meaning_language: s.meaning.language,
      },
      answerKey: {
        kind: 'mcq', ...baseKey(s), correct_index: options.indexOf(s), option_private: options.map((o) => o.scope === 'private'),
        translation_vi: result.translation_vi,
      },
      hints: choiceHints(s, maxDefinitionChars), blank: null, distractorSenseIds: input.wrong.map((w) => w.sense_id),
    };
  }
  // Each distractor is one of the candidates sent (checkMcq), so it has a sense.
  const senseOf = new Map(input.form.candidates.map((form, i) => [normalizeAnswer(form), input.form.senses[i]]));
  const distractors = input.result.distractors.map((text) => ({ text, sense: senseOf.get(normalizeAnswer(text))! }));
  const options = shuffle([{ text: input.form.answerForm, sense: null }, ...distractors], random);
  return {
    type: 'mcq_sentence', promptStyle: 'sentence',
    prompt: { kind: 'mcq_sentence', sentence: result.sentence, options: options.map((o) => o.text) },
    answerKey: {
      kind: 'mcq', ...baseKey(s), correct_index: options.findIndex((o) => o.sense === null),
      option_private: options.map((o) => (o.sense ?? s).scope === 'private'), translation_vi: result.translation_vi,
    },
    hints: choiceHints(s, maxDefinitionChars), blank: null, distractorSenseIds: distractors.map((d) => d.sense.sense_id),
  };
}

/** Cloze from one of the learner's saved sentences (design §7.3): no AI, answers as Bước 4's sentence typing. */
export function ownSentenceQuestion(s: PracticeSense, masked: MaskedExample, nativeLanguage: NativeLanguage,
  maxDefinitionChars: number): BuiltQuestion {
  // A base blank in an accepted spelling takes every accepted spelling; an inflected or non-accepted one only itself.
  const takesAll = masked.base && (masked.blank === s.lemma || s.accepted.includes(masked.blank));
  const accepted = takesAll ? [s.lemma, ...s.accepted, masked.blank] : [masked.blank];
  return {
    type: 'cloze', promptStyle: 'sentence', prompt: { kind: 'cloze', sentence: masked.masked },
    answerKey: { kind: 'type_word', ...baseKey(s), main: masked.blank, accepted: normalizedSet(accepted), translation_vi: null },
    hints: clozeHints(s, masked.blank, nativeLanguage, maxDefinitionChars),
    blank: { text: masked.blank, base: masked.base }, distractorSenseIds: [],
  };
}
