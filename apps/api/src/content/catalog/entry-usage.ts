import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';

/** Why a catalog entry cannot be deleted. The admin web writes one sentence per code. */
export const ENTRY_USAGE_REASONS = [
  'published-sense', 'form-of-link', 'learner-data', 'batch-record', 'publish-job', 'active-job',
] as const;
export type EntryUsageReason = (typeof ENTRY_USAGE_REASONS)[number];

/** What belongs to the entry being checked, read inside the delete transaction (plain values, no Content rows). */
export type EntryUsageScope = {
  entryId: string; lemma: string; pos: string;
  senseIds: string[]; revisionIds: string[]; variantIds: string[]; levelIds: string[];
};

export type EntryUsageModule = 'learning' | 'practice' | 'pipeline';
/** Modules whose probe must be registered, or no entry is deleted (fail closed: a missing probe is not "nothing found"). */
export const REQUIRED_ENTRY_USAGE_MODULES: readonly EntryUsageModule[] = ['learning', 'practice', 'pipeline'];

/**
 * The part of the delete check that reads another module's tables (D3: only that module's code queries them). It runs in the
 * delete transaction, after the entry row is locked, and returns the codes of what it found, an empty list when nothing.
 */
export interface EntryUsageProbe {
  readonly module: EntryUsageModule;
  reasonsFor(tx: Prisma.TransactionClient, scope: EntryUsageScope): Promise<EntryUsageReason[]>;
}

/** Other modules register their probe when they start (as handlers do in the job registry). */
@Injectable()
export class EntryUsageRegistry {
  private readonly probes = new Map<EntryUsageModule, EntryUsageProbe>();

  register(probe: EntryUsageProbe): void {
    this.probes.set(probe.module, probe);
  }

  /** Every required probe, or an error: an unregistered module would otherwise look like "no references". */
  all(): EntryUsageProbe[] {
    const missing = REQUIRED_ENTRY_USAGE_MODULES.filter((module) => !this.probes.has(module));
    if (missing.length > 0) throw new Error(`Entry usage probe not registered: ${missing.join(', ')}`);
    return [...this.probes.values()];
  }
}
