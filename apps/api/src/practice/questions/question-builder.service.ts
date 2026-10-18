import { Inject, Injectable } from '@nestjs/common';
import { ContentService, maskExample, type CandidateSense, type PracticeSense } from '../../content/index.js';
import { LearningService } from '../../learning/index.js';
import type { AppSettings } from '../../settings/index.js';
import { normalizeAnswer } from '../grading/normalize.js';
import { MCQ_OPTIONS } from '../practice.constants.js';
import type { AnswerKey, Blank, Hints, Prompt, PromptStyle, QuestionType } from '../practice.types.js';
import { eligibleCandidates, pickDistractors, shuffle } from './distractors.js';
import { buildHints } from './hints.js';
import { availableTypes, chooseType, typingStyle } from './question-types.js';

type NativeLanguage = 'vi' | 'en';

export type BuiltQuestion = {
  type: QuestionType; promptStyle: PromptStyle; prompt: Prompt; answerKey: AnswerKey; hints: Hints;
  // practice_questions.blank: sentence prompts only.
  blank: Blank | null;
  distractorSenseIds: string[];
};
export type BuildInput = {
  userId: string; nativeLanguage: NativeLanguage; senseId: string; chosenTypes: QuestionType[];
  promptStyle: 'meaning' | 'sentence' | 'mixed'; previousType: QuestionType | null; avoidDistractors: string[];
  settings: AppSettings['practice']; random: () => number;
};

const DISTRACTORS = MCQ_OPTIONS - 1;

/** Builds one question from the learner's groups and Content (design 7.3–7.7, D34); nothing here is written. */
@Injectable()
export class QuestionBuilder {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(LearningService) private readonly learning: LearningService,
  ) {}

  /**
   * The chosen types each word can take now (design 7.3); a word missing from the map is not visible. One group-mates call
   * and one candidates call for the whole batch.
   */
  async availability(input: { userId: string; nativeLanguage: NativeLanguage; senseIds: string[]; chosenTypes: QuestionType[] }):
    Promise<Map<string, QuestionType[]>> {
    const { userId, nativeLanguage, senseIds, chosenTypes } = input;
    const need = chosenTypes.includes('mcq_definition') ? DISTRACTORS : chosenTypes.includes('true_false_definition') ? 1 : 0;
    const mates = need > 0 ? await this.learning.practiceGroupMates(userId, senseIds) : new Map<string, string[]>();
    const ids = [...new Set([...senseIds, ...[...mates.values()].flat()])];
    const senses = await this.content.practiceCandidates(userId, ids, nativeLanguage);
    const result = new Map<string, QuestionType[]>();
    for (const senseId of senseIds) {
      const asked = senses.get(senseId);
      if (!asked) continue;
      const candidates = (mates.get(senseId) ?? []).flatMap((id) => senses.get(id) ?? []);
      result.set(senseId, availableTypes(asked, eligibleCandidates(asked, candidates, need).length, chosenTypes));
    }
    return result;
  }

  async build(input: BuildInput): Promise<BuiltQuestion | { skip: 'not-visible' | 'no-type' }> {
    const { userId, nativeLanguage, senseId, random } = input;
    const sense = (await this.content.practiceSenses(userId, [senseId], nativeLanguage)).get(senseId);
    if (!sense) return { skip: 'not-visible' };
    const mates = (await this.learning.practiceGroupMates(userId, [senseId])).get(senseId) ?? [];
    const candidates = await this.content.practiceCandidates(userId, mates, nativeLanguage);
    const eligible = eligibleCandidates(sense, mates.flatMap((id) => candidates.get(id) ?? []));
    const available = availableTypes(sense, eligible.length, input.chosenTypes);
    if (available.length === 0) return { skip: 'no-type' };
    const type = chooseType(available, input.previousType, random);

    const target = { lemma: sense.lemma, variants: sense.variants, inflections: sense.inflections };
    const masked = sense.examples.flatMap((example) => maskExample(example, target) ?? []);
    const reveal = { lemma: sense.lemma, meaning: sense.meaning.text, definition_en: sense.definition_en };
    const asked_private = sense.scope === 'private';
    const meaning = { meaning: sense.meaning.text, meaning_language: sense.meaning.language, context_label: sense.context_label };
    const hints = (style: PromptStyle, main: string) => buildHints({
      type, style, meaning: sense.meaning, definition_en: sense.definition_en, maskedFirstExample: masked[0]?.masked ?? null,
      main, maxDefinitionChars: input.settings.hintDefinitionMaxChars,
    });

    if (type === 'mcq_definition') {
      const distractors = pickDistractors(eligible, DISTRACTORS, input.avoidDistractors, random)!;
      const options: Array<PracticeSense | CandidateSense> = shuffle([sense, ...distractors], random);
      return {
        type, promptStyle: 'meaning', prompt: { kind: 'mcq', ...meaning, options: options.map((o) => o.lemma) },
        answerKey: {
          kind: 'mcq', reveal, asked_private, correct_index: options.indexOf(sense),
          option_private: options.map((o) => o.scope === 'private'),
        },
        hints: hints('meaning', sense.lemma), blank: null, distractorSenseIds: distractors.map((d) => d.sense_id),
      };
    }
    if (type === 'true_false_definition') {
      const isTrue = random() * 100 < input.settings.trueFalseTruePercent;
      const paired = isTrue ? sense : pickDistractors(eligible, 1, input.avoidDistractors, random)![0];
      return {
        type, promptStyle: 'meaning',
        // D37 (owner): true/false never shows a context label, on the true pair or the false one.
        prompt: {
          kind: 'true_false', lemma: sense.lemma, meaning: paired.meaning.text, meaning_language: paired.meaning.language,
          context_label: null,
        },
        answerKey: { kind: 'true_false', reveal, asked_private, is_true: isTrue, paired_private: paired.scope === 'private' },
        hints: hints('meaning', sense.lemma), blank: null, distractorSenseIds: isTrue ? [] : [paired.sense_id],
      };
    }
    const style = typingStyle(input.promptStyle, masked.length > 0, random);
    if (style === 'sentence') {
      const chosen = masked[Math.floor(random() * masked.length)];
      // A base blank in an accepted spelling takes every accepted spelling; an inflected or non-accepted one only itself.
      const takesAll = chosen.base && (chosen.blank === sense.lemma || sense.accepted.includes(chosen.blank));
      const accepted = takesAll ? [sense.lemma, ...sense.accepted, chosen.blank] : [chosen.blank];
      return {
        type, promptStyle: 'sentence', prompt: { kind: 'type_sentence', sentence: chosen.masked },
        answerKey: { kind: 'type_word', reveal, asked_private, main: chosen.blank, accepted: normalizedSet(accepted) },
        hints: hints('sentence', chosen.blank), blank: { text: chosen.blank, base: chosen.base }, distractorSenseIds: [],
      };
    }
    return {
      type, promptStyle: 'meaning', prompt: { kind: 'type_meaning', ...meaning },
      answerKey: {
        kind: 'type_word', reveal, asked_private, main: sense.lemma, accepted: normalizedSet([sense.lemma, ...sense.accepted]),
      },
      hints: hints('meaning', sense.lemma), blank: null, distractorSenseIds: [],
    };
  }
}

const normalizedSet = (texts: string[]) => [...new Set(texts.map(normalizeAnswer))];
