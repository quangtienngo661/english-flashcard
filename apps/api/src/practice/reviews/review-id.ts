import { createHash } from 'node:crypto';

/**
 * The key of one review in the learning log (`learning_log.review_id`, a uuid, unique per learner). A review of the asked word keeps the
 * item id, as before. An alternative answer has a second word on the same item, so its review is keyed by the item and the word: a UUID
 * made from SHA-256 of `<item>:<sense>` (first 16 bytes, version 8, RFC 4122 variant). Pressing a row twice writes once.
 */
export function reviewIdFor(itemId: string, senseId: string, askedSenseId: string): string {
  if (senseId === askedSenseId) return itemId;
  const bytes = createHash('sha256').update(`${itemId}:${senseId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
