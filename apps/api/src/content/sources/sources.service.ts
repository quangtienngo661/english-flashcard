import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { CreateSourceBody, UpdateSourceBody } from './sources.schemas.js';

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

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const notFound = () => problem(404, 'not-found', 'Not found');
const sourceProtected = () => problem(409, 'source-protected', 'Source is protected');
const sourceInUse = () => problem(409, 'source-in-use', 'Source in use');

function errorCode(error: unknown): unknown {
  return error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
}

/** A raw statement reports a foreign-key refusal as P2010 (originalCode 23503), a model call as P2003. */
function isForeignKeyViolation(error: unknown): boolean {
  if (errorCode(error) === 'P2003') return true;
  if (errorCode(error) !== 'P2010') return false;
  const cause = (error as { meta?: { driverAdapterError?: { cause?: { originalCode?: unknown; kind?: unknown } } } }).meta
    ?.driverAdapterError?.cause;
  return cause?.originalCode === '23503' || cause?.kind === 'ForeignKeyConstraintViolation';
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

  /** Only a third_party source can change (`kind` never does); the owner source is built in. */
  async update(id: string, body: UpdateSourceBody): Promise<SourceView> {
    try {
      const row = await this.prisma.dataSource.update({
        where: { id, kind: 'third_party' },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.version !== undefined ? { version: body.version } : {}),
          ...(body.url !== undefined ? { url: body.url } : {}),
          ...(body.license !== undefined ? { license: body.license } : {}),
          ...(body.attribution !== undefined ? { attribution: body.attribution } : {}),
          ...(body.display_priority !== undefined ? { displayPriority: body.display_priority } : {}),
        },
        select: sourceSelect,
      });
      return toView(row);
    } catch (error) {
      if (errorCode(error) === 'P2002') throw problem(409, 'source-exists', 'Source exists');
      if (errorCode(error) === 'P2025') {
        // The kind filter matched no row: there is no such source, or it is the owner's.
        const kind = await this.kindOf(id);
        if (kind === null) throw notFound();
        if (kind === 'owner') throw sourceProtected();
      }
      throw error;
    }
  }

  /**
   * One guarded statement: the source goes only when it is third_party and no level, import batch or row key refers to it.
   * The last two are plain UUID columns of the pipeline module (no foreign key), so they are checked here by hand; the
   * foreign key of entry_levels (ON DELETE RESTRICT) stays the backstop for a level written while this runs.
   */
  async remove(id: string): Promise<void> {
    try {
      const deleted = await this.prisma.$executeRaw`
        DELETE FROM data_sources ds
        WHERE ds.id = ${id}::uuid AND ds.kind = 'third_party'
          AND NOT EXISTS (SELECT 1 FROM entry_levels WHERE source_id = ds.id)
          AND NOT EXISTS (SELECT 1 FROM import_batches WHERE level_source_id = ds.id)
          AND NOT EXISTS (SELECT 1 FROM import_row_keys WHERE source_id = ds.id)`;
      if (deleted === 1) return;
    } catch (error) {
      if (isForeignKeyViolation(error)) throw sourceInUse();
      throw error;
    }
    // Nothing was deleted: no such source, the owner's, or one that something still refers to.
    const kind = await this.kindOf(id);
    if (kind === null) throw notFound();
    throw kind === 'owner' ? sourceProtected() : sourceInUse();
  }

  private async kindOf(id: string): Promise<string | null> {
    const row = await this.prisma.dataSource.findUnique({ where: { id }, select: { kind: true } });
    return row?.kind ?? null;
  }
}
