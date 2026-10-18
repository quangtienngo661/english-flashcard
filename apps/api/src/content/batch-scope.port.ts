export const BATCH_SCOPE = 'CONTENT_BATCH_SCOPE';

/** Pipeline supplies this port without Content importing pipeline tables or providers. */
export interface BatchScope {
  entryIdsOf(batchId: string): Promise<string[]>;
  senseIdsOf(batchId: string): Promise<string[]>;
}
