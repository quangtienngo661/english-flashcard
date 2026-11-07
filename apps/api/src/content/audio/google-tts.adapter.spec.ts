import { describe, expect, it, vi } from 'vitest';
import { FakeTtsAdapter } from './fake-tts.adapter.js';
import { GoogleTtsAdapter, requestInput } from './google-tts.adapter.js';

const grpc = (code: number, message = 'grpc') => Object.assign(new Error(message), { code });

function google(synthesizeSpeech: (request: unknown) => Promise<unknown>) {
  const client = { synthesizeSpeech: vi.fn(synthesizeSpeech) };
  return { client, adapter: new GoogleTtsAdapter(client as never) };
}
const audio = (bytes: string) => [{ audioContent: Buffer.from(bytes) }];

describe('GoogleTtsAdapter (round C, design §5.5)', () => {
  it('no phonemes: plain text input, the voice name and its language, MP3', async () => {
    const { client, adapter } = google(async () => audio('mp3'));
    const outcome = await adapter.synthesize({ voiceName: 'en-GB-Wavenet-B', text: 'lead', phonemes: null });
    expect(client.synthesizeSpeech).toHaveBeenCalledExactlyOnceWith({
      input: { text: 'lead' }, voice: { languageCode: 'en-GB', name: 'en-GB-Wavenet-B' }, audioConfig: { audioEncoding: 'MP3' },
    });
    expect(outcome).toEqual({ ok: true, audio: Buffer.from('mp3'), chars: 4 });
  });

  it('phonemes: SSML with one phoneme tag; chars is the length of what was sent', async () => {
    const { client, adapter } = google(async () => audio('mp3'));
    const outcome = await adapter.synthesize({ voiceName: 'en-US-Wavenet-D', text: 'lead', phonemes: 'ˈlɛd' });
    const ssml = '<speak><phoneme alphabet="ipa" ph="ˈlɛd">lead</phoneme></speak>';
    expect(client.synthesizeSpeech.mock.calls[0][0]).toMatchObject({ input: { ssml }, voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' } });
    expect(outcome).toMatchObject({ ok: true, chars: ssml.length });
  });

  it('the text and the phonemes are escaped for XML', () => {
    expect(requestInput({ voiceName: 'v', text: 'AT&T <b> "x"', phonemes: 'a&b"c' })).toEqual({
      ssml: '<speak><phoneme alphabet="ipa" ph="a&amp;b&quot;c">AT&amp;T &lt;b&gt; &quot;x&quot;</phoneme></speak>',
    });
  });

  it('INVALID_ARGUMENT (3) is permanent', async () => {
    const { adapter } = google(async () => { throw grpc(3, 'bad ssml'); });
    expect(await adapter.synthesize({ voiceName: 'en-GB-Wavenet-B', text: 'a', phonemes: 'x' })).toEqual({ ok: false, kind: 'permanent', message: 'bad ssml' });
  });

  it('UNAVAILABLE (14), RESOURCE_EXHAUSTED (8), DEADLINE_EXCEEDED (4) and a network error are transient', async () => {
    for (const error of [grpc(14), grpc(8), grpc(4), Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }), new Error('plain')]) {
      const { adapter } = google(async () => { throw error; });
      expect(await adapter.synthesize({ voiceName: 'en-GB-Wavenet-B', text: 'a', phonemes: null })).toMatchObject({ ok: false, kind: 'transient' });
    }
  });

  it('an answer with no audio is permanent: asking again would not help', async () => {
    const { adapter } = google(async () => [{ audioContent: new Uint8Array() }]);
    expect(await adapter.synthesize({ voiceName: 'en-GB-Wavenet-B', text: 'a', phonemes: null })).toMatchObject({ ok: false, kind: 'permanent' });
  });

  it('an error message never carries the request text of a learner word beyond Google own message', async () => {
    const { adapter } = google(async () => { throw grpc(14, 'x'.repeat(2000)); });
    const outcome = await adapter.synthesize({ voiceName: 'en-GB-Wavenet-B', text: 'a', phonemes: null });
    expect(outcome.ok === false && outcome.message.length).toBeLessThanOrEqual(500);
  });
});

describe('FakeTtsAdapter', () => {
  it('returns a tiny fixed mp3 and counts the characters like Google', async () => {
    const adapter = new FakeTtsAdapter();
    const outcome = await adapter.synthesize({ voiceName: 'en-GB-Wavenet-B', text: 'lead', phonemes: null });
    expect(outcome).toMatchObject({ ok: true, chars: 4 });
    if (outcome.ok) {
      expect(outcome.audio.subarray(0, 3).toString('latin1')).toBe('ID3');
      expect(outcome.audio.length).toBeGreaterThan(100);
    }
  });

  it('"fail:permanent" fails for good; "fail:twice" is transient twice then fine', async () => {
    const adapter = new FakeTtsAdapter();
    expect(await adapter.synthesize({ voiceName: 'v', text: 'fail:permanent', phonemes: null })).toMatchObject({ ok: false, kind: 'permanent' });
    const twice = { voiceName: 'v', text: 'fail:twice', phonemes: null };
    expect(await adapter.synthesize(twice)).toMatchObject({ ok: false, kind: 'transient' });
    expect(await adapter.synthesize(twice)).toMatchObject({ ok: false, kind: 'transient' });
    expect(await adapter.synthesize(twice)).toMatchObject({ ok: true });
  });
});
