import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { CreateTopicBody, TopicNames, UpdateTopicBody } from './topics.schemas.js';

export type TopicView = { code: string; names: TopicNames; archived_at: string | null };
export type LearnerTopicView = { code: string; name: string };
const topicSelect = {
  code: true, archivedAt: true, names: { select: { language: true, name: true } },
} satisfies Prisma.TopicSelect;
type TopicRow = Prisma.TopicGetPayload<{ select: typeof topicSelect }>;
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

function toView(row: TopicRow): TopicView {
  return {
    code: row.code, names: Object.fromEntries(row.names.map(({ language, name }) => [language, name])),
    archived_at: row.archivedAt?.toISOString() ?? null,
  };
}

function nameRows(names: TopicNames) {
  return (['vi', 'en'] as const).flatMap((language) => {
    const name = names[language];
    return name === undefined ? [] : [{ language, name }];
  });
}

@Injectable()
export class TopicsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async create(body: CreateTopicBody): Promise<TopicView> {
    try {
      const row = await this.prisma.topic.create({
        data: { code: body.code, names: { create: nameRows(body.names) } }, select: topicSelect,
      });
      return toView(row);
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ProblemDetailsException({ status: 409, title: 'Topic exists', type: 'topic-exists' });
      }
      throw error;
    }
  }

  update(code: string, body: UpdateTopicBody): Promise<TopicView> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.topic.findUnique({ where: { code }, select: topicSelect });
      if (!current) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
      if (body.names === undefined && body.archived === undefined) return toView(current);
      const row = await tx.topic.update({
        where: { code },
        data: {
          ...(body.archived !== undefined ? {
            archivedAt: body.archived ? current.archivedAt ?? this.clock.now() : null,
          } : {}),
          ...(body.names !== undefined ? { names: { upsert: nameRows(body.names).map(({ language, name }) => ({
            where: { topicCode_language: { topicCode: code, language } },
            create: { language, name }, update: { name },
          })) } } : {}),
        },
        select: topicSelect,
      });
      // Archiving never changes revision topic codes or deletes the localized names.
      return toView(row);
    }, transactionOptions);
  }

  async listAll(): Promise<{ items: TopicView[] }> {
    const rows = await this.prisma.topic.findMany({ orderBy: { code: 'asc' }, select: topicSelect });
    return { items: rows.map(toView) };
  }

  async list(nativeLanguage: 'vi' | 'en'): Promise<{ items: LearnerTopicView[] }> {
    const rows = await this.prisma.topic.findMany({
      where: { archivedAt: null }, orderBy: { code: 'asc' }, select: topicSelect,
    });
    return { items: rows.map((row) => ({
      code: row.code,
      name: row.names.find(({ language }) => language === nativeLanguage)?.name
        ?? row.names.find(({ language }) => language === 'en')?.name ?? row.code,
    })) };
  }
}
