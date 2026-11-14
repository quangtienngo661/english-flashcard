import { useCallback } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError, errorMessageKey } from './problem';

export type ErrorDetails = { message: string; code: string | null };

/**
 * One text for any thrown error: a mapped Problem, else "cannot reach the server" for a failed fetch.
 * `code` is the problem's `operation_id`, only when the text is the generic one (a mapped message needs no code).
 */
export function useErrorDetails(): (error: unknown) => ErrorDetails {
  const t = useTranslations();
  return useCallback(
    (error) => {
      if (error instanceof ApiError) {
        const key = errorMessageKey(error.problem);
        return { message: t(key), code: key === 'errors.generic' ? (error.problem.operation_id ?? null) : null };
      }
      if (error instanceof TypeError || (error instanceof Error && error.name === 'NetworkError')) {
        return { message: t('offline.message'), code: null };
      }
      return { message: t('errors.generic'), code: null };
    },
    [t],
  );
}

export function useErrorMessage(): (error: unknown) => string {
  const details = useErrorDetails();
  return useCallback((error) => details(error).message, [details]);
}
