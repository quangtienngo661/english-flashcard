/**
 * Group colour by ID (design §7.4, GM5): FNV-1a 32-bit over the UTF-8 bytes of the lower-cased ID, mod 7. The colour stays the
 * same whatever the list order and on every device; two groups can share a colour (QR5).
 */
export function groupColorIndex(id: string): number {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(id.toLowerCase())) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % 7;
}

/** Static class strings of one group colour (Tailwind sees every literal below): face border, cards behind, wash, ink, fill. */
export type GroupTone = { border: string; soft: string; wash: string; ink: string; bg: string };

const TONES: readonly GroupTone[] = [
  { border: 'border-wm-group-0', soft: 'border-wm-group-0-soft', wash: 'bg-wm-group-0-wash', ink: 'text-wm-group-0-ink', bg: 'bg-wm-group-0' },
  { border: 'border-wm-group-1', soft: 'border-wm-group-1-soft', wash: 'bg-wm-group-1-wash', ink: 'text-wm-group-1-ink', bg: 'bg-wm-group-1' },
  { border: 'border-wm-group-2', soft: 'border-wm-group-2-soft', wash: 'bg-wm-group-2-wash', ink: 'text-wm-group-2-ink', bg: 'bg-wm-group-2' },
  { border: 'border-wm-group-3', soft: 'border-wm-group-3-soft', wash: 'bg-wm-group-3-wash', ink: 'text-wm-group-3-ink', bg: 'bg-wm-group-3' },
  { border: 'border-wm-group-4', soft: 'border-wm-group-4-soft', wash: 'bg-wm-group-4-wash', ink: 'text-wm-group-4-ink', bg: 'bg-wm-group-4' },
  { border: 'border-wm-group-5', soft: 'border-wm-group-5-soft', wash: 'bg-wm-group-5-wash', ink: 'text-wm-group-5-ink', bg: 'bg-wm-group-5' },
  { border: 'border-wm-group-6', soft: 'border-wm-group-6-soft', wash: 'bg-wm-group-6-wash', ink: 'text-wm-group-6-ink', bg: 'bg-wm-group-6' },
];

const EMPTY: GroupTone = {
  border: 'border-wm-group-empty',
  soft: 'border-wm-group-empty-soft',
  wash: 'bg-wm-group-empty-wash',
  ink: 'text-wm-group-empty-ink',
  bg: 'bg-wm-group-empty',
};

/** The tone of a group: its ID colour, or the slate "nhóm trống" tone while it has no word. */
export function groupTone(id: string, total: number): GroupTone {
  return total === 0 ? EMPTY : TONES[groupColorIndex(id)];
}
