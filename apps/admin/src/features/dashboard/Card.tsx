import type { ReactNode } from 'react';

/** One question of the dashboard on its own card: title, one line of scope, then charts and figures. */
export function Card({ icon, title, hint, children, wide }: { icon: string; title: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-panel border-2 border-border bg-surface p-5 ${wide ? 'shell:col-span-2' : ''}`}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-control bg-primary-soft text-sm">{icon}</span>
          {title}
        </h2>
        {hint && <p className="text-ui text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-ui font-bold text-ink">{children}</h3>;
}
