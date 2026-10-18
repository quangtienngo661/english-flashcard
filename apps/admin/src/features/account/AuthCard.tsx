import type { ReactNode } from 'react';
import { Logo } from '../../ui/Logo';

/** Logo above a centred card (Figma `account/*`): the card is `min(100% - 2rem, 25rem)` wide. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-page-pad-min py-10 shell:px-page-pad-max">
      <Logo />
      <section className="flex w-full max-w-auth-card-max flex-col gap-4 rounded-card bg-surface p-7 shadow-sheet">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="break-words text-ui text-muted">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}
