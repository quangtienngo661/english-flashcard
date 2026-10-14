/** A number under a small label, on its own card (Figma batch/job counters). */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-panel bg-surface px-4 py-3 shadow-card">
      <p className="text-xs text-muted">{label}</p>
      <p className="break-words text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
