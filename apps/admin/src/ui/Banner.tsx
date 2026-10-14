import { Info, TriangleAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'info' | 'error' | 'offline';

const STYLE: Record<Variant, string> = {
  info: 'bg-primary-soft border-primary text-ink',
  error: 'bg-danger-soft border-danger text-danger-strong',
  offline: 'bg-surface border-border-strong text-ink',
};

const ICON = { info: Info, error: TriangleAlert, offline: WifiOff } as const;

/** `error` and `offline` interrupt (role alert); `info` is a quiet status. */
export function Banner({ variant, children, action }: { variant: Variant; children: ReactNode; action?: ReactNode }) {
  const Icon = ICON[variant];
  return (
    <div
      role={variant === 'info' ? 'status' : 'alert'}
      className={`flex flex-wrap items-center gap-3 rounded-control border px-3 py-3 text-ui ${STYLE[variant]}`}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {action}
    </div>
  );
}
