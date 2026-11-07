import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { SenseIpa, SpeechTarget } from './audio-key.js';

/** A recording to make: the target plus which voice (`uk` / `us`) it is. */
export type SpeechRow = SpeechTarget & { voice: 'uk' | 'us' };

/** The SQL of speech audio (round C): reads of the senses that need recordings, and the `speech_audio` table itself. */
@Injectable()
export class AudioRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * The senses asked for, plus every visible catalog sense of the same lemmas: how many ways a word is said depends on all of them.
   * A sense that is not open and published is left out (it needs no recording); a private sense comes only when asked for by id.
   */
  async loadSenseIpa(senseIds: string[], db: Prisma.TransactionClient | PrismaClient = this.prisma): Promise<SenseIpa[]> {
    if (senseIds.length === 0) return [];
    const rows = await db.$queryRaw<Array<{ sense_id: string; lemma: string; scope: 'catalog' | 'private'; ipa_uk: string | null; ipa_us: string | null }>>`
      WITH lemmas AS (
        SELECT DISTINCT e.lemma FROM senses s JOIN entries e ON e.id = s.entry_id WHERE s.id = ANY(${senseIds}::uuid[])
      )
      SELECT s.id::text AS sense_id, e.lemma, e.scope, r.ipa_uk, r.ipa_us
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id
      WHERE s.state = 'open' AND s.live_revision_id IS NOT NULL
        AND (s.id = ANY(${senseIds}::uuid[])
          OR (e.scope = 'catalog' AND e.language = 'en' AND e.lemma IN (SELECT lemma FROM lemmas)))
      ORDER BY e.lemma, s.id`;
    return rows.map((row) => ({ senseId: row.sense_id, lemma: row.lemma, scope: row.scope, ipaUk: row.ipa_uk, ipaUs: row.ipa_us }));
  }

  /** Adds the recordings that do not exist yet as `pending` (INSERT … ON CONFLICT DO NOTHING); returns the keys it really added. */
  async insertPending(targets: SpeechRow[]): Promise<string[]> {
    if (targets.length === 0) return [];
    const rows = await this.prisma.$queryRaw<Array<{ key: string }>>`
      INSERT INTO speech_audio (key, voice, voice_name, text, phonemes, status, attempts, created_at, updated_at)
      SELECT t.key, t.voice, t.voice_name, t.text, t.phonemes, 'pending', 0, now(), now()
      FROM unnest(${targets.map((t) => t.key)}::text[], ${targets.map((t) => t.voice)}::text[], ${targets.map((t) => t.voiceName)}::text[],
        ${targets.map((t) => t.text)}::text[], ${targets.map((t) => t.phonemes)}::text[]) AS t(key, voice, voice_name, text, phonemes)
      ON CONFLICT (key) DO NOTHING
      RETURNING key`;
    return rows.map((row) => row.key);
  }

  /** Every sense on show (catalog and every learner's own), for the weekly cleanup: it needs all of them to know which keys are used. */
  async loadAllSenseIpa(): Promise<SenseIpa[]> {
    const rows = await this.prisma.$queryRaw<Array<{ sense_id: string; lemma: string; scope: 'catalog' | 'private'; ipa_uk: string | null; ipa_us: string | null }>>`
      SELECT s.id::text AS sense_id, e.lemma, e.scope, r.ipa_uk, r.ipa_us
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id
      WHERE s.state = 'open' AND s.live_revision_id IS NOT NULL
      ORDER BY e.lemma, s.id`;
    return rows.map((row) => ({ senseId: row.sense_id, lemma: row.lemma, scope: row.scope, ipaUk: row.ipa_uk, ipaUs: row.ipa_us }));
  }

  /** The status and last error of these keys (only the ones that have a row). */
  async rowsByKeys(keys: string[]): Promise<Array<{ key: string; status: string; lastError: string | null }>> {
    if (keys.length === 0) return [];
    return this.prisma.speechAudio.findMany({ where: { key: { in: keys } }, select: { key: true, status: true, lastError: true } });
  }

  /** Pending rows nobody has touched since `before`: their job was lost, or never queued (Redis was down). Oldest first. */
  async stalePending(before: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.speechAudio.findMany({
      where: { status: 'pending', updatedAt: { lt: before } }, orderBy: { updatedAt: 'asc' }, take: limit, select: { key: true },
    });
    return rows.map((row) => row.key);
  }

  /** Puts the `failed` rows among these keys back to `pending` with a clean slate; returns the keys it changed. */
  async resetFailed(keys: string[], now: Date): Promise<string[]> {
    if (keys.length === 0) return [];
    const rows = await this.prisma.$queryRaw<Array<{ key: string }>>`
      UPDATE speech_audio SET status = 'pending', attempts = 0, last_error = NULL, updated_at = ${now}
      WHERE key = ANY(${keys}::text[]) AND status = 'failed' RETURNING key`;
    return rows.map((row) => row.key);
  }

  /** Rows last touched before `before` whose key is not in `used`. */
  async unusedBefore(before: Date, used: string[]): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ key: string }>>`
      SELECT key FROM speech_audio WHERE updated_at < ${before} AND NOT (key = ANY(${used}::text[])) ORDER BY key`;
    return rows.map((row) => row.key);
  }

  async deleteRows(keys: string[]): Promise<void> {
    if (keys.length > 0) await this.prisma.speechAudio.deleteMany({ where: { key: { in: keys } } });
  }

  /** Which of the keys have a file ready to play. */
  async readyKeys(keys: string[]): Promise<Set<string>> {
    if (keys.length === 0) return new Set();
    const rows = await this.prisma.speechAudio.findMany({ where: { key: { in: keys }, status: 'ready' }, select: { key: true } });
    return new Set(rows.map((row) => row.key));
  }
}
