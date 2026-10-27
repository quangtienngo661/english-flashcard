import { useCallback } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { isRefusalReason } from './entitlements-api';

/**
 * `useErrorDetails` plus the refinement of design §4.5: a 409 `grant-not-allowed` carries a `reason`, and each reason has its own
 * sentence. A missing or unknown reason keeps the general `errors.grant-not-allowed` text.
 */
export function useGrantErrorDetails(): (error: unknown) => ErrorDetails {
  const t = useTranslations();
  const base = useErrorDetails();
  return useCallback(
    (error) => {
      if (error instanceof ApiError && error.problem.slug === 'grant-not-allowed' && isRefusalReason(error.problem.reason)) {
        return { message: t(`entitlements.refusal.${error.problem.reason}`), code: null };
      }
      return base(error);
    },
    [t, base],
  );
}
