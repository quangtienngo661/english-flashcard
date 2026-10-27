import { useTranslations } from 'use-intl';
import { Banner } from './Banner';
import { Button } from './Button';

/** Offered after signing in again when `useKeptDraft` holds a draft from the session that ended (design §4.6). */
export function RestoreDraftBanner({ onRestore, onDiscard }: { onRestore: () => void; onDiscard: () => void }) {
  const t = useTranslations();
  return (
    <Banner
      variant="info"
      action={
        <div className="flex gap-2">
          <Button variant="secondary" onPress={onRestore}>
            {t('draft.restore')}
          </Button>
          <Button variant="ghost" onPress={onDiscard}>
            {t('draft.discard')}
          </Button>
        </div>
      }
    >
      {t('draft.message')}
    </Banner>
  );
}
