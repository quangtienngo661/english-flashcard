import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useSession } from '../auth/session-context';
import { Button } from '../ui/Button';
import { homePath } from './nav';

/** Shown in the page area, under the entry's own title, when the signed-in user may not open the path (A/71e). */
export function NoAccess() {
  const t = useTranslations();
  const { state } = useSession();
  const navigate = useNavigate();
  const permissions = state.status === 'signed-in' ? state.me.permissions : [];
  return (
    <section className="flex flex-col items-start gap-3 py-6">
      <p className="max-w-prose text-ui text-ink">{t('noAccess.title')}</p>
      <Button variant="secondary" onPress={() => void navigate(homePath(permissions), { replace: true })}>
        {t('noAccess.home')}
      </Button>
    </section>
  );
}
