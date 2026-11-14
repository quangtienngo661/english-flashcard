import { describe, expect, it, vi } from 'vitest';
import { TTS_BACKFILL_BATCH, runTtsBackfill } from './tts-backfill-run.js';

const ids = (count: number) => Array.from({ length: count }, (_, i) => `sense-${i}`);

/** An in-memory audio service: two keys (UK, US) per sense, none new the second time. */
function fakeAudio(enabled = true) {
  const known = new Set<string>();
  return {
    enabled,
    ensureForSenses: vi.fn(async (senseIds: string[]) => senseIds.flatMap((id) => [`${id}:uk`, `${id}:us`]).filter((key) => {
      if (known.has(key)) return false;
      known.add(key);
      return true;
    })),
  };
}

describe('runTtsBackfill (round C, design §5.6)', () => {
  it('3 senses with no file → 6 new rows (UK and US each); a second run adds none', async () => {
    const audio = fakeAudio();
    const log = vi.fn();
    const first = await runTtsBackfill({ audio, senseIds: ids(3), log });
    expect(first).toEqual({ exitCode: 0, senses: 3, created: 6 });
    const second = await runTtsBackfill({ audio, senseIds: ids(3), log });
    expect(second).toEqual({ exitCode: 0, senses: 3, created: 0 });
  });

  it('works through the senses 500 at a time', async () => {
    const audio = fakeAudio();
    await runTtsBackfill({ audio, senseIds: ids(1200), log: vi.fn() });
    expect(TTS_BACKFILL_BATCH).toBe(500);
    expect(audio.ensureForSenses.mock.calls.map(([batch]) => batch.length)).toEqual([500, 500, 200]);
  });

  it('no provider or no storage → exit 1 with "TTS chưa cấu hình", and nothing is read or made', async () => {
    const audio = fakeAudio(false);
    const log = vi.fn();
    const result = await runTtsBackfill({ audio, senseIds: ids(3), log });
    expect(result.exitCode).toBe(1);
    expect(log).toHaveBeenCalledWith('TTS chưa cấu hình');
    expect(audio.ensureForSenses).not.toHaveBeenCalled();
  });

  it('says how many senses it looked at and how many recordings it queued', async () => {
    const log = vi.fn();
    await runTtsBackfill({ audio: fakeAudio(), senseIds: ids(2), log });
    expect(log).toHaveBeenLastCalledWith('2 nghĩa đã xét; 4 bản ghi mới được xếp hàng.');
  });

  it('no senses → exit 0 and nothing queued', async () => {
    const audio = fakeAudio();
    expect(await runTtsBackfill({ audio, senseIds: [], log: vi.fn() })).toEqual({ exitCode: 0, senses: 0, created: 0 });
    expect(audio.ensureForSenses).not.toHaveBeenCalled();
  });
});
