import { useTranslations } from 'use-intl';
import { useSession } from '../auth/session-context';
import { useNow } from '../features/jobs/useNow';

/** The start-up screen; after a 429 on the session refresh it also counts down to the next try (B25E30). */
export function SessionLoading() {
  const t = useTranslations();
  const { state } = useSession();
  const retryAt = state.status === 'loading' ? state.retryAt : undefined;
  if (state.status === 'unavailable') return <Unavailable />;
  return (
    <div className="flex flex-col gap-1 p-8 text-ui text-muted">
      <p role="status">{t('shell.loadingSession')}</p>
      {/* Keyed by the deadline, so each wait starts its clock when it is announced, not when the screen first showed. */}
      {retryAt !== undefined && <Countdown key={retryAt} retryAt={retryAt} />}
    </div>
  );
}

function Countdown({ retryAt }: { retryAt: number }) {
  const t = useTranslations();
  const now = useNow(1000, true);
  // A timer, outside the live status line: a screen reader does not announce each tick (review M7).
  return <p role="timer">{t('shell.sessionRetry', { seconds: Math.max(0, Math.ceil((retryAt - now) / 1000)) })}</p>;
}

function Unavailable() {
  const t = useTranslations();
  const { store } = useSession();
  return (
    <div className="flex flex-col items-start gap-2 p-8 text-ui text-muted">
      <p role="status">{t('session.unavailable')}</p>
      <button type="button" className="underline" onClick={() => void store.bootstrap()}>
        {t('session.retry')}
      </button>
    </div>
  );
}
