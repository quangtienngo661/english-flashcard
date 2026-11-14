/** Where the mp3 of a speech key lives in the bucket or the local folder (round C, design §5.5). */
export const audioObjectKey = (key: string): string => `tts/v1/${key}.mp3`;

/**
 * Where finished recordings are kept (port). `publicUrl` is what the app plays. The implementations are Cloudflare R2 and a local
 * folder (the fake for tests and the smoke); neither is chosen when audio is off.
 */
export abstract class AudioStorage {
  abstract put(objectKey: string, body: Buffer): Promise<void>;
  /** Removes the objects; one that is already gone is not an error. Throws if any removal fails, so the caller keeps its row. */
  abstract remove(objectKeys: string[]): Promise<void>;
  abstract publicUrl(objectKey: string): string;
}
