import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue } from '../../common/time/local-date.js';
import { ContentService } from '../../content/content.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { correctOf, type AnswerResult } from '../answers/answers.service.js';
import type { AnswerKey, Prompt } from '../practice.types.js';
import { PracticeStats } from '../weak/practice-stats.js';

export type WeakWord = {
  sense_id: string; lemma: string; wrong: number; counted: number; level: number; last_wrong_at: string;
  /** Design §8.7: the meaning in the learner's language; null when the sense is no longer visible to them (GG2). */
  meaning: string | null;
};
export type HistoryItem = {
  item_id: string; session_id: string; sense_id: string; lemma: string; type: string; prompt_style: string; prompt: Prompt;
  answer: string | null; correct: AnswerResult['correct']; result: string; skipped: boolean; tries: number; hint_level: number;
  review_action: string | null; answered_at: string; local_date: string;
  /** Bước 7 (B7E124): the Vietnamese translation of an AI sentence, for a `vi` learner only. */
  translation: string | null;
};
type Page = { page_size: number; page_token?: string };

const invalidInput = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
const uuidPattern = /^[0-9a-f-]{36}$/;

/** "Từ hay sai" and the dated history (design §8, §9); only the caller's own final results. */
@Injectable()
export class HistoryService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(PracticeStats) private readonly stats: PracticeStats,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  async weakWords(userId: string, nativeLanguage: 'vi' | 'en', page: Page): Promise<{ items: WeakWord[]; next_page_token: string | null }> {
    const cursor = page.page_token === undefined ? null : decodeBoundToken(page.page_token, 'weak-words');
    if (page.page_token !== undefined && (cursor === null || typeof cursor.at !== 'string' || typeof cursor.id !== 'string')) {
      throw invalidInput();
    }
    const weak = (await this.stats.weakSenses(userId))
      .map(({ item, stats }) => ({ item, stats, at: stats.last_wrong_at! }))
      // Newest last wrong attempt first.
      .sort((a, b) => (a.at === b.at ? a.item.sense_id.localeCompare(b.item.sense_id) : a.at < b.at ? 1 : -1))
      .filter(({ at, item }) => cursor === null || at < cursor.at || (at === cursor.at && item.sense_id > (cursor.id as string)));
    const pageRows = weak.slice(0, page.page_size);
    const senseIds = pageRows.map(({ item }) => item.sense_id);
    const lemmas = await this.lemmas(userId, senseIds);
    const senses = await this.content.practiceSenses(userId, senseIds, nativeLanguage);
    const last = pageRows.at(-1);
    return {
      items: pageRows.map(({ item, stats, at }) => ({
        sense_id: item.sense_id, lemma: lemmas.get(item.sense_id) ?? '', wrong: stats.wrong, counted: stats.counted, level: item.level,
        last_wrong_at: at, meaning: senses.get(item.sense_id)?.meaning?.text ?? null,
      })),
      next_page_token: weak.length > page.page_size && last ? encodeBoundToken({ at: last.at, id: last.item.sense_id }, 'weak-words') : null,
    };
  }

  async history(userId: string, query: Page & { date?: string; sense_id?: string }, nativeLanguage: 'vi' | 'en'):
    Promise<{ items: HistoryItem[]; next_page_token: string | null }> {
    const binding = `${query.date ?? ''}|${query.sense_id ?? ''}`;
    const cursor = query.page_token === undefined ? null : decodeBoundToken(query.page_token, binding);
    if (query.page_token !== undefined
      && (cursor === null || typeof cursor.at !== 'string' || typeof cursor.id !== 'string' || !uuidPattern.test(cursor.id))) {
      throw invalidInput();
    }
    const at = cursor ? new Date(cursor.at as string) : null;
    if (at !== null && Number.isNaN(at.getTime())) throw invalidInput();
    const rows = await this.prisma.practiceSessionItem.findMany({
      where: {
        userId, result: { in: ['correct', 'wrong'] },
        ...(query.date === undefined ? {} : { localDate: dateValue(query.date) }),
        ...(query.sense_id === undefined ? {} : { senseId: query.sense_id }),
        ...(at === null ? {} : { OR: [{ answeredAt: { lt: at } }, { answeredAt: at, id: { lt: cursor!.id as string } }] }),
      },
      include: { question: true },
      orderBy: [{ answeredAt: 'desc' }, { id: 'desc' }],
      take: query.page_size + 1,
    });
    const pageRows = rows.slice(0, query.page_size);
    const last = pageRows.at(-1);
    return {
      items: pageRows.map((row) => {
        const key = row.question.answerKey as AnswerKey;
        const prompt = row.question.prompt as Prompt;
        return {
          item_id: row.id, session_id: row.sessionId, sense_id: row.senseId, lemma: key.reveal.lemma, type: row.question.type,
          prompt_style: row.question.promptStyle, prompt, answer: row.answerRaw, correct: correctOf(key, prompt), result: row.result!,
          skipped: row.skipped, tries: row.tries, hint_level: row.hintLevel, review_action: row.reviewAction,
          answered_at: row.answeredAt!.toISOString(), local_date: dateString(row.localDate!),
          translation: nativeLanguage === 'vi' ? key.translation_vi ?? null : null,
        };
      }),
      next_page_token: rows.length > query.page_size && last
        ? encodeBoundToken({ at: last.answeredAt!.toISOString(), id: last.id }, binding) : null,
    };
  }

  /** The lemma of each sense from its newest stored question (a retired or private sense keeps its own word). */
  private async lemmas(userId: string, senseIds: string[]): Promise<Map<string, string>> {
    if (senseIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<Array<{ sense_id: string; lemma: string }>>`
      SELECT DISTINCT ON (sense_id) sense_id::text AS sense_id, answer_key->'reveal'->>'lemma' AS lemma
      FROM practice_questions WHERE user_id = ${userId}::uuid AND sense_id = ANY(${senseIds}::uuid[])
      ORDER BY sense_id, created_at DESC`;
    return new Map(rows.map((row) => [row.sense_id, row.lemma]));
  }
}
