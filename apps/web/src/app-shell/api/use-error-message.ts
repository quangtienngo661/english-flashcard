'use client';

// Copied from apps/admin/src/api/use-error-message.ts; keys live under the `App` namespace, and a 429 names its wait (E15).
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ApiError, errorMessageKey } from './problem';

export type ErrorDetails = { message: string; code: string | null };

const RATE_LIMIT_DEFAULT_S = 10;

/**
 * One text for any thrown error: a mapped Problem, else "cannot reach the server" for a failed fetch.
 * `code` is the problem's `operation_id`, only when the text is the generic one (a mapped message needs no code).
 */
export function useErrorDetails(): (error: unknown) => ErrorDetails {
  const t = useTranslations('App');
  return useCallback(
    (error) => {
      if (error instanceof ApiError) {
        if (error.problem.status === 429) {
          return { message: t('errors.rate-limited', { seconds: error.retryAfterSeconds ?? RATE_LIMIT_DEFAULT_S }), code: null };
        }
        // errorMessageKey only returns keys of App.errors (KNOWN_ERROR_SLUGS, generic, inProgress); problem.test checks the list.
        const key = errorMessageKey(error.problem) as 'errors.generic';
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
