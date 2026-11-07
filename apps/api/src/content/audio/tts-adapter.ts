/** What a recording is asked for: the Google voice name, the text and (optionally) IPA phonemes for it. */
export type TtsRequest = { voiceName: string; text: string; phonemes: string | null };
/** `transient` may work later (Google busy, network); `permanent` never will for this request (Google refuses the input). */
export type TtsOutcome =
  | { ok: true; audio: Buffer; chars: number }
  | { ok: false; kind: 'transient' | 'permanent'; message: string };

/** The text-to-speech provider (port). The implementations are Google Cloud Text-to-Speech and a fake for tests and the smoke. */
export abstract class TtsAdapter {
  abstract synthesize(request: TtsRequest): Promise<TtsOutcome>;
}
