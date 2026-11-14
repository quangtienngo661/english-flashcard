import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef } from '../../common/user-ref.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AI_SYSTEM_ACTOR_ID, JUDGE_CODE_PATTERN } from '../ai.constants.js';
import { JUDGE_VERDICTS, SUBJECT_KINDS, type JudgeVerdict, type LabelView } from './judge.types.js';

/** Body of `PUT /v1/admin/ai/labels`: one verdict, or `null` to take the label back. */
export const putLabelSchema = z.strictObject({
  subject_kind: z.enum(SUBJECT_KINDS),
  subject_id: z.uuid().transform((value) => value.toLowerCase()),
  criterion: z.string().regex(JUDGE_CODE_PATTERN),
  verdict: z.enum(JUDGE_VERDICTS).nullable(),
});
export type PutLabelBody = z.input<typeof putLabelSchema>;

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const notFound = () => problem(404, 'not-found', 'Not found');

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

/**
 * The owner's labels (nhóm B design §5.4, D16): one verdict per criterion of one output, shared by every judge revision. A label sits on the
 * output, not on the run, so deleting a run does not delete it. Held-out outputs are never labelled (R7).
 */
@Injectable()
export class LabelsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async put(actorId: string, body: PutLabelBody): Promise<LabelView> {
    const parsed = putLabelSchema.safeParse(body);
    if (!parsed.success) throw invalid(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    const { subject_kind: subjectKind, subject_id: subjectId, criterion, verdict } = parsed.data;
    await this.checkSubject(subjectKind, subjectId);
    if (verdict === null) {
      await this.prisma.aiLabel.deleteMany({ where: { subjectKind, subjectId, criterion } });
      return { subject_kind: subjectKind, subject_id: subjectId, criterion, verdict: null, labeled_by_user: null, labeled_at: null };
    }
    const labeledAt = this.clock.now();
    const row = await this.prisma.aiLabel.upsert({
      where: { subjectKind_subjectId_criterion: { subjectKind, subjectId, criterion } },
      create: { subjectKind, subjectId, criterion, verdict, labeledBy: actorId, labeledAt },
      update: { verdict, labeledBy: actorId, labeledAt },
    });
    const emails = await this.identity.emailsOf([row.labeledBy]);
    return {
      subject_kind: subjectKind, subject_id: subjectId, criterion, verdict: row.verdict as JudgeVerdict,
      labeled_by_user: userRef(row.labeledBy, emails, SYSTEM_IDS), labeled_at: row.labeledAt.toISOString(),
    };
  }

  /** The output must exist and be one a person may judge: a dev output with an input and an output (Review focus 3, R7). */
  private async checkSubject(kind: 'eval_item' | 'real_question', subjectId: string): Promise<void> {
    if (kind === 'real_question') {
      if (!await this.prisma.aiJudgePassItem.findFirst({ where: { subjectKind: kind, subjectId }, select: { id: true } })) throw notFound();
      return;
    }
    const item = await this.prisma.aiEvalRunItem.findUnique({ where: { id: subjectId }, select: { id: true, split: true, status: true, input: true, output: true, hidden: true } });
    // A hidden item belongs to a run that was "deleted": the run answers 404 everywhere, so its items do too.
    if (!item || item.hidden) throw notFound();
    if (item.split === 'held_out') throw problem(409, 'example-held-out', 'A held-out example cannot be labelled');
    if (item.status !== 'succeeded' || item.output === null) throw invalid(['subject_id: has no output']);
    if (item.input === null) throw invalid(['subject_id: has no input']);
  }
}
