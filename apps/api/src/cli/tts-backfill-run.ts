// The work of `pnpm tts:backfill` (round C, design §5.6), apart from the entry file, which runs on import.

export const TTS_BACKFILL_BATCH = 500;

type BackfillAudio = { enabled: boolean; ensureForSenses(senseIds: string[]): Promise<string[]> };

/**
 * Makes the `speech_audio` rows (and jobs) for every catalog sense on show, 500 senses at a time; a sense that already has its rows adds
 * none, so running it again is safe. Exit 1 when no provider or no storage is configured. The worker process does the recording.
 */
export async function runTtsBackfill(
  deps: { audio: BackfillAudio; senseIds: string[]; log: (line: string) => void },
): Promise<{ exitCode: 0 | 1; senses: number; created: number }> {
  if (!deps.audio.enabled) {
    deps.log('TTS chưa cấu hình');
    return { exitCode: 1, senses: 0, created: 0 };
  }
  let created = 0;
  for (let at = 0; at < deps.senseIds.length; at += TTS_BACKFILL_BATCH) {
    created += (await deps.audio.ensureForSenses(deps.senseIds.slice(at, at + TTS_BACKFILL_BATCH))).length;
  }
  deps.log(`${deps.senseIds.length} nghĩa đã xét; ${created} bản ghi mới được xếp hàng.`);
  return { exitCode: 0, senses: deps.senseIds.length, created };
}
