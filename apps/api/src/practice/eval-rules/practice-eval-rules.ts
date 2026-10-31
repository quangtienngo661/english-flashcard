import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { AiService, type AiOperation, type EvalRules, type ExpectedForms, type RuleResult } from '../../ai/index.js';
import { ContentService, type PracticeSense } from '../../content/index.js';
import { checkCloze, checkMcq, checkMeaning, validForms } from '../ai/ai-checks.js';
import { normalizeAnswer } from '../grading/normalize.js';

const NATIVE_LANGUAGE = 'vi' as const;
const PASS: RuleResult = { status: 'pass', problems: [], reason: null };
const NOT_APPLICABLE: RuleResult = { status: 'not_applicable', problems: [], reason: null };
const fail = (problems: string[]): RuleResult => ({ status: 'fail', problems, reason: null });
const asStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/** First-seen order, no repeat. */
function union<T>(lists: T[][], same: (a: T, b: T) => boolean = (a, b) => a === b): T[] {
  const out: T[] = [];
  for (const item of lists.flat()) if (!out.some((seen) => same(seen, item))) out.push(item);
  return out;
}

/** The first sense's fields, with the spellings, accepted forms, inflections and staff-added forms of all of them (one entry per part of speech). */
export function mergeSenses(senses: PracticeSense[]): PracticeSense {
  const [first] = senses as [PracticeSense, ...PracticeSense[]];
  return {
    ...first,
    variants: union(senses.map((sense) => sense.variants)),
    accepted: union(senses.map((sense) => sense.accepted)),
    inflections: union(senses.map((sense) => sense.inflections), (a, b) => a.form === b.form && a.kind === b.kind),
    extra_forms: union(senses.map((sense) => sense.extra_forms)),
  };
}

/**
 * Practice's rules for the eval (nhóm B design §5.2, D11): the same `checkCloze` / `checkMeaning` / `checkMcq` a learner's question
 * goes through, on the catalog entry of the word, run once. It records nothing: an eval is not learner data, so an unknown form is
 * only reported.
 */
@Injectable()
export class PracticeEvalRules implements EvalRules, OnModuleInit {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(AiService) private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    this.ai.registerEvalRules(this);
  }

  async check(op: AiOperation, input: Record<string, unknown>, output: Record<string, unknown>): Promise<RuleResult> {
    if (op !== 'generate_cloze' && op !== 'generate_meaning_question' && op !== 'generate_sentence_mcq') return { ...NOT_APPLICABLE };
    const senses = await this.senses(String(input.word ?? ''), String(input.part_of_speech ?? ''));
    if (senses.length === 0) return { status: 'skipped', problems: [], reason: 'not-in-catalog' };
    const sense = mergeSenses(senses);
    if (op === 'generate_cloze') {
      const result = checkCloze({ sentence: String(output.sentence ?? ''), accepted_answers: asStrings(output.accepted_answers) }, sense);
      if (result.ok) return { ...PASS };
      return fail([...result.unknownForms.map((form) => `unknown-form:${form}`), ...(result.reveals ? ['reveals-word'] : [])]);
    }
    if (op === 'generate_meaning_question') {
      const result = checkMeaning({ sentence: String(output.sentence ?? ''), word_in_sentence: String(output.word_in_sentence ?? '') }, sense);
      if (result.ok) return { ...PASS };
      return fail(result.unknownForms.length > 0 ? result.unknownForms.map((form) => `unknown-form:${form}`) : ['word-not-once']);
    }
    const result = checkMcq(
      { sentence: String(output.sentence ?? ''), distractors: asStrings(output.distractors) }, String(input.answer_form ?? ''),
      asStrings(input.candidates), sense,
    );
    return result.ok ? { ...PASS } : fail(['mcq-check']);
  }

  async formsOf(word: string, partOfSpeech: string): Promise<string[] | null> {
    const senses = await this.senses(word, partOfSpeech);
    return senses.length === 0 ? null : [...validForms(mergeSenses(senses))];
  }

  matchesExpected(op: 'generate_cloze' | 'generate_meaning_question', output: Record<string, unknown>, expected: ExpectedForms): boolean {
    const forms = new Set(expected.forms.map(normalizeAnswer));
    if (op === 'generate_meaning_question') return forms.has(normalizeAnswer(String(output.word_in_sentence ?? '')));
    const answers = asStrings(output.accepted_answers);
    return answers.length > 0 && answers.every((answer) => forms.has(normalizeAnswer(answer)));
  }

  /** `unspecified` takes every part of speech of the lemma (design §5.2). */
  private senses(word: string, partOfSpeech: string): Promise<PracticeSense[]> {
    return this.content.catalogPracticeSensesByLemma(word, partOfSpeech === 'unspecified' ? null : partOfSpeech, NATIVE_LANGUAGE);
  }
}
