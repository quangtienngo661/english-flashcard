import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { CreateSourceBody } from './sources.schemas.js';

export type SourceView = {
  id: string;
  kind: 'third_party' | 'owner';
  name: string;
  version: string;
  url: string | null;
  license: string;
  attribution: string;
  display_priority: number;
};

const sourceSelect = {
  id: true, kind: true, name: true, version: true, url: true,
  license: true, attribution: true, displayPriority: true,
} satisfies Prisma.DataSourceSelect;
type SourceRow = Prisma.DataSourceGetPayload<{ select: typeof sourceSelect }>;

function toView(row: SourceRow): SourceView {
  return {
    id: row.id, kind: row.kind as SourceView['kind'], name: row.name, version: row.version,
    url: row.url, license: row.license, attribution: row.attribution, display_priority: row.displayPriority,
  };
}

/** What the public licence page shows (design §9, CR18): no internal ids, kinds or priorities. */
export type PublicSourceView = Pick<SourceView, 'name' | 'version' | 'url' | 'license' | 'attribution'>;

export function toPublicView({ name, version, url, license, attribution }: SourceView): PublicSourceView {
  return { name, version, url, license, attribution };
}

export function isSourceComplete(source: SourceView): boolean {
  return source.kind === 'owner' || (source.version.trim().length > 0 && source.license.trim().length > 0);
}

@Injectable()
export class SourcesService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async getSource(id: string): Promise<SourceView | null> {
    const row = await this.prisma.dataSource.findUnique({ where: { id }, select: sourceSelect });
    return row ? toView(row) : null;
  }

  async list(): Promise<{ items: SourceView[] }> {
    const rows = await this.prisma.dataSource.findMany({
      orderBy: [{ displayPriority: 'asc' }, { id: 'asc' }], select: sourceSelect,
    });
    return { items: rows.map(toView) };
  }

  async create(body: CreateSourceBody): Promise<SourceView> {
    try {
      const row = await this.prisma.dataSource.create({
        data: {
          kind: 'third_party', name: body.name, version: body.version, url: body.url,
          license: body.license, attribution: body.attribution, displayPriority: body.display_priority,
        },
        select: sourceSelect,
      });
      return toView(row);
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ProblemDetailsException({ status: 409, title: 'Source exists', type: 'source-exists' });
      }
      throw error;
    }
  }
}
