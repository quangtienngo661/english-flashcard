import { TtsAdapter, type TtsOutcome, type TtsRequest } from './tts-adapter.js';
import { requestInput } from './google-tts.adapter.js';

// A tiny fixed MP3: an ID3v2 header with no frames, then one silent MPEG-1 Layer III frame (128 kbit/s, 44.1 kHz, 417 bytes).
const ID3 = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const FRAME = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(413)]);
const FAKE_MP3 = Buffer.concat([ID3, FRAME]);

/**
 * The fake provider (`TTS_FAKE_ENABLED`; never in production). A word `fail:permanent` is refused for good; `fail:twice` is refused
 * twice as a transient error and then works, so tests and the smoke can see the retry path.
 */
export class FakeTtsAdapter extends TtsAdapter {
  private readonly seen = new Map<string, number>();

  async synthesize(request: TtsRequest): Promise<TtsOutcome> {
    const input = requestInput(request);
    const chars = ('text' in input ? input.text : input.ssml).length;
    if (request.text === 'fail:permanent') return { ok: false, kind: 'permanent', message: 'fake: refused' };
    if (request.text === 'fail:twice') {
      const times = (this.seen.get(request.text) ?? 0) + 1;
      this.seen.set(request.text, times);
      if (times <= 2) return { ok: false, kind: 'transient', message: 'fake: try again' };
    }
    return { ok: true, audio: Buffer.from(FAKE_MP3), chars };
  }
}
