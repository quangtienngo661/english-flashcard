type Tone = 'primary' | 'accent' | 'neutral' | 'danger';

const BG: Record<Tone, string> = {
  primary: 'bg-primary-soft',
  accent: 'bg-accent-soft',
  neutral: 'bg-neutral-soft',
  danger: 'bg-danger-soft',
};

/** A big number over a small label on a tile coloured by meaning (design §6.2): created, updated, unchanged, rejected. */
export function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-panel px-4 py-3 ${BG[tone]}`}>
      <p className={`break-words text-2xl font-extrabold tabular-nums ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** The total under the tiles ("Tổng số dòng" in the mockup). */
export function StatTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t-2 border-border pt-3 font-semibold tabular-nums text-ink">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
