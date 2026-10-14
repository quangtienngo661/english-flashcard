import { Inbox, Loader, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { Button } from './Button';

type Props = { state: 'loading' | 'empty' | 'error'; emptyText?: string; emptyHint?: string; onRetry?: () => void };

/** The one place a list shows "loading", "nothing here" or "could not load" (owner, Figma review 14/10/2026). */
export function ListState({ state, emptyText, emptyHint, onRetry }: Props) {
  const t = useTranslations();
  const box = 'flex flex-col items-center gap-3 px-4 py-10 text-center text-ui text-muted';
  if (state === 'loading') {
    return (
      <div role="status" className={box}>
        <Loader aria-hidden className="size-5 animate-spin" />
        <p>{t('list.loading')}</p>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div role="alert" className={box}>
        <TriangleAlert aria-hidden className="size-5 text-danger" />
        <p className="text-danger-strong">{t('list.error')}</p>
        {onRetry && (
          <Button variant="secondary" onPress={onRetry}>
            {t('common.retry')}
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className={box}>
      <Inbox aria-hidden className="size-5" />
      <p>{emptyText ?? t('list.empty')}</p>
      {emptyHint && <p className="text-xs">{emptyHint}</p>}
    </div>
  );
}
