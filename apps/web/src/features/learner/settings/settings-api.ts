'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';
import type { Me } from '@/app-shell/session/session-store';

export type Reminders = { enabled: boolean; email_verified: boolean };
const REMINDERS_KEY = ['me', 'reminders'] as const;

export function useReminders() {
  const api = useApi();
  return useQuery({ queryKey: REMINDERS_KEY, queryFn: () => api.get<Reminders>('/v1/me/reminders') });
}

/** `PATCH /v1/me/reminders` is `[I]`: the caller passes the key of the press (useSubmitOnce). */
export function useSetReminders() {
  const api = useApi();
  const client = useQueryClient();
  return async (enabled: boolean, idempotencyKey: string) => {
    const next = await api.patch<Reminders>('/v1/me/reminders', { enabled }, { idempotencyKey });
    client.setQueryData(REMINDERS_KEY, next);
  };
}

export type ProfilePatch = Partial<Pick<Me, 'native_language' | 'given_name' | 'family_name' | 'birth_date'>>;

export function useUpdateProfile() {
  const api = useApi();
  return (patch: ProfilePatch) => api.patch<Me>('/v1/me', patch);
}
