import { useCallback } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError, errorMessageKey } from './problem';

/** One text for any thrown error: a mapped Problem, else "cannot reach the server" for a failed fetch. */
export function useErrorMessage(): (error: unknown) => string {
  const t = useTranslations();
  return useCallback(
    (error) => {
      if (error instanceof ApiError) return t(errorMessageKey(error.problem));
      if (error instanceof TypeError || (error instanceof Error && error.name === 'NetworkError')) return t('offline.message');
      return t('errors.generic');
    },
    [t],
  );
}
