import { Info, TriangleAlert, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'use-intl';

type Variant = 'info' | 'error' | 'offline' | 'warning';

const STYLE: Record<Variant, string> = {
  info: 'bg-primary-soft text-ink',
  error: 'bg-danger-soft text-danger',
  offline: 'bg-accent-soft text-ink',
  warning: 'bg-accent-soft text-ink',
};

const ICON = { info: Info, error: TriangleAlert, offline: WifiOff, warning: TriangleAlert } as const;

/** `error`, `offline` and `warning` interrupt (role alert); `info` is a quiet status. */
export function Banner({
  variant,
  children,
  action,
  code,
}: {
  variant: Variant;
  children: ReactNode;
  action?: ReactNode;
  /** The `operation_id` of an unexpected error, shown with a copy button so it can be quoted to support. */
  code?: string | null;
}) {
  const t = useTranslations();
  const Icon = ICON[variant];
  return (
    <div
      role={variant === 'info' ? 'status' : 'alert'}
      className={`flex flex-wrap items-center gap-3 rounded-panel px-4 py-3 text-ui ${STYLE[variant]}`}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <div className="min-w-0 flex-1 break-words">
        {children}
        {code && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span>{t('errors.code', { code })}</span>
            <button
              type="button"
              className="underline"
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText(code)?.catch(() => {});
                } catch {
                  /* clipboard unavailable: the code stays visible to copy by hand */
                }
              }}
            >
              {t('errors.copyCode')}
            </button>
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
