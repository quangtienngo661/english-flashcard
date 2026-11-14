import { isDeepStrictEqual } from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import {
  AI_SYSTEM_ACTOR_ID, JUDGE_CODE_PATTERN, JUDGE_CRITERIA_MAX, JUDGE_NAME_MAX, JUDGE_QUESTION_MAX,
} from '../ai.constants.js';
import { AI_OPERATIONS, type AiOperation, type AiProviderName } from '../ai.types.js';
import { selectionViolations } from '../models/model-rules.js';
import { promptViolations, type PromptExample } from '../prompts/prompt-rules.js';
import type { JudgeCriterion } from './judge.types.js';

const trimmed = (max: number) => z.string().trim().min(1).max(max);

/** A judge's whole definition: what `POST /v1/admin/ai/judges` takes (nhóm B design §5.4). Every key is required. */
export const judgeBodySchema = z.strictObject({
  name: trimmed(JUDGE_NAME_MAX),
  operations: z.array(z.enum(AI_OPERATIONS)).min(1).refine((list) => new Set(list).size === list.length, 'operations must be unique'),
  active: z.boolean(),
  criteria: z.array(z.strictObject({ code: z.string().regex(JUDGE_CODE_PATTERN), question: trimmed(JUDGE_QUESTION_MAX) }))
    .min(1).max(JUDGE_CRITERIA_MAX)
    .refine((list) => new Set(list.map((criterion) => criterion.code)).size === list.length, 'codes must be unique'),
  instructions: z.string(),
  examples: z.array(z.unknown()),
  model_ref: z.uuid().transform((value) => value.toLowerCase()).nullable(),
  effort: z.string().min(1).max(20).nullable(),
  thinking: z.literal('off').nullable(),
  max_output_tokens: z.number().int().min(1).nullable(),
});
/** Saving adds a revision to an existing judge: `expected_revision` is the one the page was showing. */
export const saveJudgeSchema = judgeBodySchema.extend({ expected_revision: z.number().int().min(1) });
export const cloneJudgeSchema = z.strictObject({ name: trimmed(JUDGE_NAME_MAX) });
export type JudgeBody = z.input<typeof judgeBodySchema>;
export type SaveJudgeBody = z.input<typeof saveJudgeSchema>;
export type CloneJudgeBody = z.input<typeof cloneJudgeSchema>;

export type JudgeRevisionView = {
  id: string;
  revision: number;
  criteria: JudgeCriterion[];
  instructions: string;
  examples: PromptExample[];
  model: { id: string; provider: AiProviderName; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  saved_by_user: UserRef;
  saved_at: string;
};
export type JudgeView = {
  id: string;
  name: string;
  operations: AiOperation[];
  active: boolean;
  created_at: string;
  latest: JudgeRevisionView;
};

type ModelRow = { id: string; provider: string; modelId: string; effortLevels: string[]; thinkingOff: string | null; maxOutputTokens: number | null };
type RevisionRow = {
  id: string; judgeId: string; revision: number; criteria: unknown; instructions: string; examples: unknown; modelRef: string | null;
  effort: string | null; thinking: string | null; maxOutputTokens: number | null; savedBy: string; savedAt: Date; model: ModelRow | null;
};
type JudgeRow = { id: string; name: string; operations: string[]; active: boolean; createdBy: string; createdAt: Date };

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const notFound = () => problem(404, 'not-found', 'Not found');
const conflict = () => problem(409, 'judge-revision-conflict', 'The judge has a newer revision');
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

/** The fields of a revision: a new revision exists only when one of them changes (Review focus 4). */
type RevisionFields = {
  criteria: JudgeCriterion[]; instructions: string; examples: unknown[]; modelRef: string | null; effort: string | null;
  thinking: 'off' | null; maxOutputTokens: number | null;
};

const fieldsOf = (body: z.output<typeof judgeBodySchema>): RevisionFields => ({
  criteria: body.criteria, instructions: body.instructions, examples: body.examples, modelRef: body.model_ref, effort: body.effort,
  thinking: body.thinking, maxOutputTokens: body.max_output_tokens,
});

/** `util.isDeepStrictEqual` ignores key order, which Postgres does not keep in a jsonb column. */
const sameFields = (row: RevisionRow, fields: RevisionFields): boolean => isDeepStrictEqual(row.criteria, fields.criteria)
  && row.instructions === fields.instructions && isDeepStrictEqual(row.examples, fields.examples) && row.modelRef === fields.modelRef
  && row.effort === fields.effort && row.thinking === fields.thinking && row.maxOutputTokens === fields.maxOutputTokens;

const revisionData = (fields: RevisionFields, savedBy: string) => ({
  criteria: fields.criteria as Prisma.InputJsonArray, instructions: fields.instructions, examples: fields.examples as Prisma.InputJsonArray,
  modelRef: fields.modelRef, effort: fields.effort, thinking: fields.thinking, maxOutputTokens: fields.maxOutputTokens, savedBy,
});

const prismaCode = (error: unknown): unknown => (error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined);

/**
 * Judges as revisioned configs (nhóm B design §5.4, D3, D13, E4). A judge serves no learner, so it has no draft and no publish: the newest
 * revision is the one in use. Saving with only a name, operations or active change adds no revision, so the scores and the calibration of
 * the revision keep applying.
 */
@Injectable()
export class JudgesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Oldest first, each with its newest revision. */
  async list(): Promise<{ items: JudgeView[] }> {
    const judges = await this.prisma.aiJudge.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) as JudgeRow[];
    if (judges.length === 0) return { items: [] };
    const rows = await this.prisma.aiJudgeRevision.findMany({
      where: { judgeId: { in: judges.map((judge) => judge.id) } }, include: { model: true }, orderBy: [{ revision: 'desc' }],
    }) as RevisionRow[];
    const latest = new Map<string, RevisionRow>();
    for (const row of rows) if (!latest.has(row.judgeId)) latest.set(row.judgeId, row);
    const emails = await this.identity.emailsOf([...latest.values()].map((row) => row.savedBy));
    return { items: judges.flatMap((judge) => {
      const row = latest.get(judge.id);
      return row ? [this.view(judge, row, emails)] : [];
    }) };
  }

  async create(actorId: string, body: JudgeBody): Promise<JudgeView> {
    const input = parse(judgeBodySchema, body);
    await this.checkRevision(input);
    const created = await this.prisma.aiJudge.create({
      data: {
        name: input.name, operations: input.operations, active: input.active, createdBy: actorId,
        revisions: { create: { revision: 1, ...revisionData(fieldsOf(input), actorId) } },
      },
      select: { id: true },
    });
    return this.get(created.id);
  }

  async save(actorId: string, id: string, body: SaveJudgeBody): Promise<JudgeView> {
    const input = parse(saveJudgeSchema, body);
    if (!await this.prisma.aiJudge.findUnique({ where: { id }, select: { id: true } })) throw notFound();
    await this.checkRevision(input);
    const latest = await this.latestRow(id);
    if (!latest) throw notFound();
    if (input.expected_revision !== latest.revision) throw conflict();
    const fields = fieldsOf(input);
    const changed = !sameFields(latest, fields);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.aiJudge.update({ where: { id }, data: { name: input.name, operations: input.operations, active: input.active } });
        if (changed) await tx.aiJudgeRevision.create({ data: { judgeId: id, revision: latest.revision + 1, ...revisionData(fields, actorId) } });
      });
    } catch (error) {
      // Two saves of the same revision at once: the unique (judge, revision) lets only one in.
      if (prismaCode(error) === 'P2002') throw conflict();
      throw error;
    }
    return this.get(id);
  }

  /** A new judge with the source's operations and newest revision, to try another model on the same criteria (D3). */
  async clone(actorId: string, id: string, body: CloneJudgeBody): Promise<JudgeView> {
    const input = parse(cloneJudgeSchema, body);
    const source = await this.prisma.aiJudge.findUnique({ where: { id } }) as JudgeRow | null;
    if (!source) throw notFound();
    const latest = await this.latestRow(id);
    if (!latest) throw notFound();
    const fields: RevisionFields = {
      criteria: latest.criteria as JudgeCriterion[], instructions: latest.instructions, examples: latest.examples as unknown[],
      modelRef: latest.modelRef, effort: latest.effort, thinking: latest.thinking === 'off' ? 'off' : null, maxOutputTokens: latest.maxOutputTokens,
    };
    const created = await this.prisma.aiJudge.create({
      data: {
        name: input.name, operations: source.operations, active: true, createdBy: actorId,
        revisions: { create: { revision: 1, ...revisionData(fields, actorId) } },
      },
      select: { id: true },
    });
    return this.get(created.id);
  }

  /** Newest first. */
  async revisions(id: string): Promise<{ items: JudgeRevisionView[] }> {
    if (!await this.prisma.aiJudge.findUnique({ where: { id }, select: { id: true } })) throw notFound();
    const rows = await this.prisma.aiJudgeRevision.findMany({ where: { judgeId: id }, include: { model: true }, orderBy: [{ revision: 'desc' }] }) as RevisionRow[];
    const emails = await this.identity.emailsOf(rows.map((row) => row.savedBy));
    return { items: rows.map((row) => this.revisionView(row, emails)) };
  }

  /** The revision a pass would use now; null for an unknown judge. */
  async latestRevision(judgeId: string): Promise<{ id: string; revision: number } | null> {
    const row = await this.prisma.aiJudgeRevision.findFirst({ where: { judgeId }, orderBy: { revision: 'desc' }, select: { id: true, revision: true } });
    return row ? { id: row.id, revision: row.revision } : null;
  }

  private async get(id: string): Promise<JudgeView> {
    const judge = await this.prisma.aiJudge.findUnique({ where: { id } }) as JudgeRow | null;
    const latest = await this.latestRow(id);
    if (!judge || !latest) throw notFound();
    const emails = await this.identity.emailsOf([latest.savedBy]);
    return this.view(judge, latest, emails);
  }

  private latestRow(judgeId: string): Promise<RevisionRow | null> {
    return this.prisma.aiJudgeRevision.findFirst({ where: { judgeId }, orderBy: { revision: 'desc' }, include: { model: true } }) as Promise<RevisionRow | null>;
  }

  /** The save rules of create and save, in order; the first failing rule answers. */
  private async checkRevision(input: z.output<typeof judgeBodySchema>): Promise<void> {
    const rules = promptViolations('judge', { instructions: input.instructions, examples: input.examples });
    if (rules.length > 0) throw invalid(rules);
    if (input.model_ref === null) return;
    const model = await this.prisma.aiModel.findUnique({ where: { id: input.model_ref } }) as ModelRow | null;
    if (!model) throw invalid(['model_ref: not found']);
    const provider = model.provider as AiProviderName;
    // A judge is Anthropic's alone (D3, E13); the fake stands in for it only while the fake provider is on.
    if (provider !== 'anthropic' && !(provider === 'fake' && this.config.ai.fakeEnabled)) {
      throw problem(422, 'judge-provider', 'A judge needs an Anthropic model');
    }
    if (!this.registry.get(provider)) throw problem(409, 'provider-not-configured', 'Provider not configured');
    const choice = selectionViolations({
      provider, model, effort: input.effort, thinking: input.thinking, maxOutputTokens: input.max_output_tokens,
    });
    if (choice.length > 0) throw invalid(choice);
  }

  private revisionView(row: RevisionRow, emails: ReadonlyMap<string, string>): JudgeRevisionView {
    return {
      id: row.id, revision: row.revision, criteria: row.criteria as JudgeCriterion[], instructions: row.instructions,
      examples: row.examples as PromptExample[],
      model: row.model ? { id: row.model.id, provider: row.model.provider as AiProviderName, model_id: row.model.modelId } : null,
      effort: row.effort, thinking: row.thinking === 'off' ? 'off' : null, max_output_tokens: row.maxOutputTokens,
      saved_by_user: userRef(row.savedBy, emails, SYSTEM_IDS), saved_at: row.savedAt.toISOString(),
    };
  }

  private view(judge: JudgeRow, latest: RevisionRow, emails: ReadonlyMap<string, string>): JudgeView {
    return {
      id: judge.id, name: judge.name, operations: judge.operations as AiOperation[], active: judge.active, created_at: judge.createdAt.toISOString(),
      latest: this.revisionView(latest, emails),
    };
  }
}
