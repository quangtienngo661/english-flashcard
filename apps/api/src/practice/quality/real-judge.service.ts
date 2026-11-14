import { Inject, Injectable } from '@nestjs/common';
import { AiService, type JudgeSubject, type RealJudgeTarget, type RealPassView } from '../../ai/index.js';
import { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef } from '../../common/user-ref.js';
import { ContentService } from '../../content/index.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import type { RealJudgeEstimate, RealJudgeFilters, RealPassItemView, RealPassWithStarter, Skipped } from './real-judge.types.js';
import { RealQuestionsRepository } from './real-questions.repository.js';
import { isFailing, metaOf, parseOutput, sessionWords, touchesPrivateWord, type RealQuestionRow } from './real-questions.js';

const DAY_MS = 86_400_000;
/** `judgedSubjects` asks the database with an `IN` list: a window of tens of thousands of questions is asked in slices. */
const JUDGED_SLICE = 5000;

const notFound = () => new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const nothingToJudge = (reason: 'retention-off' | 'no-staff' | 'empty', skipped: Skipped) => new ProblemDetailsException({
  status: 409, type: 'nothing-to-judge', title: 'There is nothing to judge', extensions: { reason, skipped },
});

type Chosen = { row: RealQuestionRow; input: Record<string, unknown>; output: Record<string, unknown> };

/** What one reading of the window decided; `estimate` and `start` both come from it, and neither reuses the other's. */
type Selection = {
  target: RealJudgeTarget;
  limit: number;
  retentionDays: number;
  adminUsdCap: number | null;
  since: Date;
  userIds: string[] | null;
  reason: 'retention-off' | 'no-staff' | null;
  skipped: Skipped;
  chosen: Chosen[];
  remaining: number;
};

/**
 * Judging the real AI questions of the last days (nhóm B M4, design §7.1, D26, D35). Practice picks the questions and builds the snapshots
 * (the data is Practice's); the pass itself runs in `ai`. A question that touches a learner's private word is never judged (R6, B39).
 */
@Injectable()
export class RealJudgeService {
  constructor(
    @Inject(AiService) private readonly ai: AiService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(RealQuestionsRepository) private readonly questions: RealQuestionsRepository,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** The count, what was left out and why, and the cost to expect, before anything is started. */
  async estimate(_actorId: string, f: RealJudgeFilters): Promise<RealJudgeEstimate> {
    const s = await this.select(f);
    const selected = s.chosen.length;
    const pairs = s.reason === null ? await this.questions.pairs({ since: s.since, operation: f.operation, userIds: s.userIds }) : [];
    const perSubject = selected === 0 ? null : await this.ai.judgeCostPerSubject(s.target.revisionId);
    return {
      judge_revision: s.target.revision, selected, remaining: s.remaining, limit: s.limit, skipped: s.skipped,
      // Four decimals of a cent would show as noise: the cost of a few hundred calls is rounded to eight decimals, as the ledger stores it.
      estimate_usd: perSubject === null ? null : Math.round(selected * perSubject * 1e8) / 1e8, admin_usd_cap: s.adminUsdCap,
      reason: s.reason, retention_days: s.retentionDays, pairs,
    };
  }

  /** Selects again (never the estimate's list) and queues the pass; the gateway's own refusals pass through unchanged. */
  async start(actorId: string, f: RealJudgeFilters): Promise<{ pass_id: string; selected: number; skipped: Skipped }> {
    const s = await this.select(f);
    if (s.chosen.length === 0) throw nothingToJudge(s.reason ?? 'empty', s.skipped);
    const sessionSenseIds = [...new Set(s.chosen.flatMap(({ row }) => row.sessionSenseIds))];
    const senses = await this.content.practiceCandidates(actorId, sessionSenseIds, 'vi');
    const subjects: JudgeSubject[] = s.chosen.map(({ row, input, output }) => ({
      subjectId: row.id, input, output, context: { session_words: sessionWords(row.senseId, row.sessionSenseIds, senses) },
    }));
    const { passId } = await this.ai.startJudgePass({
      judgeId: f.judge_id, kind: 'real', actorId, subjects,
      filters: {
        operation: f.operation, config: f.config, test_accounts_only: f.test_accounts_only, limit: s.limit, since: s.since.toISOString(), skipped: s.skipped,
      },
    });
    return { pass_id: passId, selected: subjects.length, skipped: s.skipped };
  }

  /** The passes, newest first, each with the address of whoever started it (one lookup for the page). */
  async passes(pageSize: number, pageToken?: string): Promise<{ items: RealPassWithStarter[]; next_page_token: string | null }> {
    const page = await this.ai.realJudgePasses(pageSize, pageToken);
    return { items: await this.withStarters(page.items), next_page_token: page.next_page_token };
  }

  /**
   * One pass with its questions, newest question first; a question deleted since (account deletion, `history_months`) is listed from the pass's snapshot,
   * after the others and in the pass's order, and cannot be added to the examples (Review focus 5).
   */
  async passItems(passId: string): Promise<{ pass: RealPassWithStarter; items: RealPassItemView[] }> {
    const found = await this.ai.realJudgePass(passId);
    if (!found) throw notFound();
    const [pass] = await this.withStarters([found.pass]);
    const existing = found.items.length === 0 ? new Map<string, { createdAt: Date; aiMeta: unknown }>() : await this.questions.questions(found.items.map((item) => item.subject_id));
    const items = found.items.map(({ subject_id, ...item }): RealPassItemView => {
      const question = existing.get(subject_id);
      const failed = isFailing(item.scores);
      const meta = metaOf(question?.aiMeta ?? null);
      return {
        ...item, question_id: subject_id, created_at: question?.createdAt.toISOString() ?? null, config_number: meta.config_number, model: meta.model,
        provider: meta.provider, failed, can_add_to_examples: failed && question !== undefined,
      };
    });
    // `sort` is stable: a gone question (no date) keeps the pass's order, after every question that still has one.
    items.sort((a, b) => (a.created_at === null ? (b.created_at === null ? 0 : 1) : b.created_at === null ? -1 : a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
    return { pass: pass!, items };
  }

  private async withStarters(passes: RealPassView[]): Promise<RealPassWithStarter[]> {
    const emails = await this.identity.emailsOf(passes.map((pass) => pass.started_by));
    return passes.map((pass) => ({ ...pass, started_by_user: userRef(pass.started_by, emails) }));
  }

  private async select(f: RealJudgeFilters): Promise<Selection> {
    const target = await this.ai.realJudgeTarget(f.judge_id);
    if (!target) throw notFound();
    if (!target.operations.includes(f.operation)) throw invalid(['operation: not judged by this judge']);
    if (!target.active) throw invalid(['judge_id: judge is not active']);
    const { ai } = await this.settings.get();
    const since = new Date(this.clock.now().getTime() - ai.contentRetentionDays * DAY_MS);
    const empty: Selection = {
      target, limit: ai.realJudgeLimit, retentionDays: ai.contentRetentionDays, adminUsdCap: ai.adminDailyUsdCap, since, userIds: null, reason: null,
      skipped: { private_word: 0, no_content: 0, already_judged: 0 }, chosen: [], remaining: 0,
    };
    // B38: with no content kept there is nothing to read (the kept content is what a judge looks at).
    if (ai.contentRetentionDays === 0) return { ...empty, reason: 'retention-off' };
    let userIds: string[] | null = null;
    if (f.test_accounts_only) {
      // The role as it is now (D35, B47): read on every estimate and every start, never cached.
      userIds = await this.identity.staffUserIds();
      if (userIds.length === 0) return { ...empty, userIds, reason: 'no-staff' };
    }
    const rows = await this.questions.window({ since, operation: f.operation, config: f.config, userIds });
    const skipped = empty.skipped;
    const readable: RealQuestionRow[] = [];
    for (const row of rows) {
      if (touchesPrivateWord(row)) skipped.private_word += 1;
      else if (row.aiInput === null) skipped.no_content += 1;
      else readable.push(row);
    }
    const judged = await this.judgedAmong(target.revisionId, readable.map((row) => row.id));
    skipped.already_judged = readable.filter((row) => judged.has(row.id)).length;
    const todo = readable.filter((row) => !judged.has(row.id));
    // Chunks of `limit`: the content of each is read once, and the reading stops when `limit` questions are chosen.
    const chosen: Chosen[] = [];
    let examined = 0;
    for (let start = 0; start < todo.length && chosen.length < empty.limit; start += empty.limit) {
      const chunk = todo.slice(start, start + empty.limit);
      const callIds = chunk.flatMap((row) => metaOf(row.aiMeta).call_operation_id ?? []);
      const contents = callIds.length === 0 ? new Map() : await this.ai.callContents(callIds);
      for (const row of chunk) {
        if (chosen.length >= empty.limit) break;
        examined += 1;
        const callId = metaOf(row.aiMeta).call_operation_id;
        const output = callId === null ? null : parseOutput(contents.get(callId)?.response ?? null);
        if (output === null) skipped.no_content += 1;
        else chosen.push({ row, input: row.aiInput!.data as Record<string, unknown>, output });
      }
    }
    return { ...empty, userIds, skipped, chosen, remaining: todo.length - examined };
  }

  private async judgedAmong(revisionId: string, ids: string[]): Promise<Set<string>> {
    const judged = new Set<string>();
    for (let start = 0; start < ids.length; start += JUDGED_SLICE) {
      for (const id of await this.ai.judgedSubjects(revisionId, ids.slice(start, start + JUDGED_SLICE))) judged.add(id);
    }
    return judged;
  }
}
