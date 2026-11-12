import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import type { AppConfig } from '../../common/config/app-config.js';
import { TtsAdapter, type TtsOutcome, type TtsRequest } from './tts-adapter.js';

const MESSAGE_MAX = 500;
/** gRPC INVALID_ARGUMENT: Google refuses this input (for instance a symbol it does not know); asking again changes nothing. */
const INVALID_ARGUMENT = 3;

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** What is sent to Google: the plain text, or SSML with one phoneme tag when the reading must be told apart. */
export function requestInput(request: TtsRequest): { text: string } | { ssml: string } {
  return request.phonemes === null ? { text: request.text }
    : { ssml: `<speak><phoneme alphabet="ipa" ph="${escapeXml(request.phonemes)}">${escapeXml(request.text)}</phoneme></speak>` };
}

/** The subset of the client the adapter uses (so tests pass a stand-in). */
type Synthesizer = Pick<TextToSpeechClient, 'synthesizeSpeech'>;

/** A client for the service account in the configuration; the credentials are passed inline and never logged. */
export function googleTtsClient(config: AppConfig): TextToSpeechClient {
  const credentials = config.tts.credentials;
  if (credentials === null) throw new Error('Google TTS credentials are not configured');
  return new TextToSpeechClient({
    projectId: credentials.projectId, credentials: { client_email: credentials.clientEmail, private_key: credentials.privateKey },
  });
}

/** Google Cloud Text-to-Speech (WaveNet voices), MP3 out (round C, design §5.5). */
export class GoogleTtsAdapter extends TtsAdapter {
  constructor(private readonly client: Synthesizer) {
    super();
  }

  async synthesize(request: TtsRequest): Promise<TtsOutcome> {
    const input = requestInput(request);
    const chars = ('text' in input ? input.text : input.ssml).length;
    try {
      const [response] = await this.client.synthesizeSpeech({
        input, voice: { languageCode: request.voiceName.slice(0, 5), name: request.voiceName }, audioConfig: { audioEncoding: 'MP3' },
      });
      const content = response.audioContent;
      const audio = typeof content === 'string' ? Buffer.from(content, 'base64') : content ? Buffer.from(content) : Buffer.alloc(0);
      if (audio.length === 0) return { ok: false, kind: 'permanent', message: 'Google returned no audio' };
      return { ok: true, audio, chars };
    } catch (error) {
      const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
      const message = (error instanceof Error ? error.message : String(error)).slice(0, MESSAGE_MAX);
      return { ok: false, kind: code === INVALID_ARGUMENT ? 'permanent' : 'transient', message };
    }
  }
}
