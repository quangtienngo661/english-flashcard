import type { LandingCopy } from '../copy';

// The "Nhóm" screen's cards (features/learner/groups): a tinted head with the six-box bar, then name and waiting count. Sample data.
function Bar({ filled }: { filled: number }) {
  return (
    <span aria-hidden className="flex items-center gap-1">
      <span className="h-6 w-2.5 rounded-sm bg-ink" />
      {[1, 2, 3, 4, 5].map((box) => (
        <span key={box} className={`h-1.5 w-5 rounded-full border-2 border-ink ${box <= filled ? 'bg-ink' : ''}`} />
      ))}
    </span>
  );
}

function GroupCard({ tint, filled, count, name, waiting }: { tint: string; filled: number; count: string; name: string; waiting: string }) {
  return (
    <div className="grid overflow-hidden rounded-card border border-border bg-surface shadow-sheet">
      <div className={`px-4 py-3.5 ${tint}`}>
        <Bar filled={filled} />
      </div>
      <div className="flex flex-col items-start gap-2 p-4">
        <span className="text-caption text-muted">{count}</span>
        <h3 className="text-title font-bold text-ink">{name}</h3>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-ink">{waiting}</span>
      </div>
    </div>
  );
}

export function GroupsDemo({ copy }: { copy: LandingCopy['showcase']['groups'] }) {
  const words = [
    [copy.w1, copy.w1m],
    [copy.w2, copy.w2m],
    [copy.w3, copy.w3m],
    [copy.w4, copy.w4m],
  ];
  return (
    <div data-ui role="group" aria-label={copy.title} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <GroupCard tint="bg-hero" filled={1} count={copy.g1Count} name={copy.g1Name} waiting={copy.g1Waiting} />
      <GroupCard tint="bg-accent-soft" filled={2} count={copy.g2Count} name={copy.g2Name} waiting={copy.g2Waiting} />
      <div className="grid gap-2 rounded-card bg-accent-soft p-4 sm:col-span-2">
        <b className="text-body text-ink">{copy.quickTitle}</b>
        <ul className="flex flex-wrap gap-2">
          {words.map(([word, meaning]) => (
            <li key={word} className="rounded-control bg-surface px-2.5 py-1 text-ui text-ink">
              <b className="mr-1.5" lang="en">
                {word}
              </b>
              {meaning}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
