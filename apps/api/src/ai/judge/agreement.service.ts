import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { agreement, type Agreement } from './agreement.js';
import { JUDGE_VERDICTS, type JudgeCriterion, type JudgeVerdict } from './judge.types.js';

export type JudgeAgreementView = {
  label_min: number;
  agreement_min: number;
  items: Array<{ judge_revision_id: string; revision: number; criterion: string } & Agreement>;
};

type PairRow = { judge_revision_id: string; criterion: string; label: string; score: string | null };

const isVerdict = (value: string | null): value is JudgeVerdict => value !== null && (JUDGE_VERDICTS as readonly string[]).includes(value);

/** What a revision with no label at all looks like. */
const NO_LABELS: Agreement = { labeled: 0, agree: 0, agree_exact: 0, rate: null, exact_rate: null, calibrated: false };

/**
 * How well each judge revision agrees with the owner's labels (nhóm B design §5.4, D15), per criterion. A pair is a score with a verdict and the
 * label on the same (kind, subject, criterion); a "không chấm được" score has no pair. The rule itself is the pure `agreement`.
 */
@Injectable()
export class JudgeAgreement {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  /** Keyed by `${revisionId}|${criterion}`; a pair of revision and criterion with no pair is absent (contract §4d). */
  async forRevisions(revisionIds: string[]): Promise<Map<string, Agreement>> {
    const result = new Map<string, Agreement>();
    if (revisionIds.length === 0) return result;
    const [{ ai }, rows] = await Promise.all([
      this.settings.get(),
      this.prisma.$queryRaw<PairRow[]>(Prisma.sql`
        SELECT s.judge_revision_id::text AS judge_revision_id, s.criterion, l.verdict AS label, s.verdict AS score
        FROM ai_judge_scores s JOIN ai_labels l ON l.subject_kind = s.subject_kind AND l.subject_id = s.subject_id AND l.criterion = s.criterion
        WHERE s.judge_revision_id = ANY(${revisionIds}::uuid[]) AND s.verdict IS NOT NULL`),
    ]);
    const pairs = new Map<string, Array<{ label: JudgeVerdict; score: JudgeVerdict }>>();
    for (const row of rows) {
      if (!isVerdict(row.label) || !isVerdict(row.score)) continue;
      const key = `${row.judge_revision_id}|${row.criterion}`;
      pairs.set(key, [...(pairs.get(key) ?? []), { label: row.label, score: row.score }]);
    }
    for (const [key, list] of pairs) result.set(key, agreement(list, { labels: ai.judgeLabelMin, ratio: ai.judgeAgreementMin }));
    return result;
  }

  /** Every revision × criterion of the judge, newest revision first, with the two limits that make "đã hiệu chỉnh". */
  async forJudge(judgeId: string): Promise<JudgeAgreementView> {
    if (!await this.prisma.aiJudge.findUnique({ where: { id: judgeId }, select: { id: true } })) {
      throw new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });
    }
    const revisions = await this.prisma.aiJudgeRevision.findMany({
      where: { judgeId }, orderBy: [{ revision: 'desc' }], select: { id: true, revision: true, criteria: true },
    });
    const [measured, { ai }] = await Promise.all([this.forRevisions(revisions.map((revision) => revision.id)), this.settings.get()]);
    return {
      label_min: ai.judgeLabelMin,
      agreement_min: ai.judgeAgreementMin,
      items: revisions.flatMap((revision) => (revision.criteria as JudgeCriterion[]).map((criterion) => ({
        judge_revision_id: revision.id, revision: revision.revision, criterion: criterion.code,
        ...(measured.get(`${revision.id}|${criterion.code}`) ?? NO_LABELS),
      }))),
    };
  }
}
