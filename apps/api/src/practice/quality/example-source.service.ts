import { Inject, Injectable } from '@nestjs/common';
import { AiService } from '../../ai/index.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService, type PracticeSense } from '../../content/index.js';
import { pickMcqForm, pickWrongMeanings } from '../ai/ai-checks.js';
import { clozeInput, mcqInput, meaningInput } from '../ai/ai-inputs.js';
import { PracticeEvalRules } from '../eval-rules/practice-eval-rules.js';
import { eligibleCandidates } from '../questions/distractors.js';
import type { SourcePreview, SourceRef } from './real-judge.types.js';
import { RealQuestionsRepository } from './real-questions.repository.js';
import { maskedOptionIn, metaOf, PRACTICE_AI_OPERATIONS, touchesPrivateWord, type PracticeAiOperation } from './real-questions.js';

const NATIVE_LANGUAGE = 'vi' as const;
const POS_UNSET = 'unspecified';
/** More random catalog words than the three a question needs: some are dropped as the answer's own forms or meanings. */
const MCQ_RANDOM_WORDS = 12;
const WRONG_MEANINGS = 3;

const notFound = () => new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });
type NotEligible = 'report-not-confirmed' | 'not-ai' | 'private-word' | 'sense-gone' | 'no-input';
const notEligible = (reason: NotEligible) => new ProblemDetailsException({
  status: 409, type: 'source-not-eligible', title: 'This question cannot be added to the examples', extensions: { reason },
});

/**
 * "Đưa vào bộ ví dụ" (nhóm B M4, design §7.2, D27): a confirmed report or a real question becomes a `dev` eval example. Practice owns the data, so the
 * input is the one the AI was sent while its request is kept, else it is rebuilt from the catalog (E17). A question that touches a learner's private
 * word never becomes an example (R6, B39).
 */
@Injectable()
export class ExampleSourceService {
  constructor(
    @Inject(RealQuestionsRepository) private readonly questions: RealQuestionsRepository,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(PracticeEvalRules) private readonly rules: PracticeEvalRules,
    @Inject(AiService) private readonly ai: AiService,
  ) {}

  async preview(_actorId: string, ref: SourceRef): Promise<SourcePreview> {
    return (await this.resolve(ref)).preview;
  }

  /**
   * The input of the example when the request is gone: the sense as it is now, with the wrong meanings or the distractors chosen anew from the catalog
   * (the learner's group is not known any more, E17). Too few to choose from, or a sense with no Vietnamese meaning, is a 409 `no-input`.
   */
  async rebuildInput(
    op: PracticeAiOperation, sense: PracticeSense, actorId: string, random: () => number = Math.random,
  ): Promise<Record<string, unknown>> {
    if (sense.gloss_vi === null) throw notEligible('no-input');
    if (op === 'generate_cloze') return clozeInput(sense);
    if (op === 'generate_meaning_question') {
      const others = (await this.content.catalogPracticeSensesByLemma(sense.lemma, sense.pos, NATIVE_LANGUAGE)).filter((other) => other.sense_id !== sense.sense_id);
      const randoms = await this.content.practiceRandomMeanings(actorId, [sense.lemma], WRONG_MEANINGS, NATIVE_LANGUAGE);
      const meanings = await this.content.practiceLemmaMeanings(actorId, [sense.lemma, ...others.map((other) => other.lemma), ...randoms.map((word) => word.lemma)], NATIVE_LANGUAGE);
      const wrong = pickWrongMeanings(sense, others, [], randoms, meanings);
      if (wrong === null) throw notEligible('no-input');
      return meaningInput(sense, wrong.map((word) => word.gloss_vi!));
    }
    const randoms = await this.content.practiceRandomMeanings(actorId, [sense.lemma], MCQ_RANDOM_WORDS, NATIVE_LANGUAGE);
    const meanings = await this.content.practiceLemmaMeanings(actorId, [sense.lemma, ...randoms.map((word) => word.lemma)], NATIVE_LANGUAGE);
    const form = pickMcqForm(sense, eligibleCandidates(sense, randoms, Infinity, meanings), random);
    if (form === null) throw notEligible('no-input');
    return mcqInput(sense, form.answerForm, form.candidates);
  }

  /** The preview again (nothing is trusted from an earlier look), the input rebuilt when needed, then M1's own checks on the example. */
  async create(
    actorId: string, body: { report_id?: string; question_id?: string; expected: Record<string, unknown> | null; note: string | null },
  ): Promise<{ id: string; operation: PracticeAiOperation; rebuilt: boolean }> {
    const { preview, sense } = await this.resolve(body.report_id !== undefined ? { report_id: body.report_id } : { question_id: body.question_id! });
    const input = preview.rebuilt ? await this.rebuildInput(preview.operation, sense!, actorId) : preview.input!;
    const { id } = await this.ai.createEvalExample({
      operation: preview.operation, input, expected: body.expected, note: body.note, source: preview.source, sourceRef: preview.source_ref, actorId,
    });
    return { id, operation: preview.operation, rebuilt: preview.rebuilt };
  }

  /** The refusals in order: unknown 404, report not confirmed, not an AI question, a private word, the sense gone; `sense` is set only when the input must be rebuilt. */
  private async resolve(ref: SourceRef): Promise<{ preview: SourcePreview; sense: PracticeSense | null }> {
    const row = await this.questions.source(ref);
    if (!row) throw notFound();
    if ('report_id' in ref && row.reportStatus !== 'confirmed') throw notEligible('report-not-confirmed');
    const { operation } = metaOf(row.aiMeta);
    if (row.questionSource !== 'ai' || operation === null || !(PRACTICE_AI_OPERATIONS as readonly string[]).includes(operation)) throw notEligible('not-ai');
    // The question row while it exists, the report's masked copy once it was cleaned up; both when both are there.
    if (touchesPrivateWord(row) || maskedOptionIn(row.snapshot)) throw notEligible('private-word');
    let sense: PracticeSense | null = null;
    let input: Record<string, unknown> | null = null;
    let word: string;
    let partOfSpeech: string;
    if (row.aiInput !== null) {
      input = row.aiInput.data as Record<string, unknown>;
      word = String(input.word);
      partOfSpeech = String(input.part_of_speech);
    } else {
      // Read as the learner who was asked: a private sense is visible only to its owner (an admin would see "gone" for a private word).
      sense = (await this.content.practiceSenses(row.ownerId, [row.senseId], NATIVE_LANGUAGE)).get(row.senseId) ?? null;
      if (sense === null) throw notEligible('sense-gone');
      if (sense.scope === 'private') throw notEligible('private-word');
      word = sense.lemma;
      partOfSpeech = sense.pos ?? POS_UNSET;
    }
    const forms = operation === 'generate_sentence_mcq' ? null : await this.rules.formsOf(word, partOfSpeech);
    const preview: SourcePreview = {
      operation: operation as PracticeAiOperation, source: 'report_id' in ref ? 'report' : 'real_judge',
      source_ref: 'report_id' in ref ? ref.report_id : ref.question_id, word, part_of_speech: partOfSpeech, input, rebuilt: input === null,
      expected: forms === null ? null : { forms },
    };
    return { preview, sense };
  }
}
