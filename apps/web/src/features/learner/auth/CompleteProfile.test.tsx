// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../../../messages/vi.json';
import { SessionProvider } from '@/app-shell/session/session-context';
import { SessionStore } from '@/app-shell/session/session-store';
import { BASE, makeFetch, makeMe, problem, tokenResponse, type Route } from '@/app-shell/session/test-support';
import { CompleteProfile } from './CompleteProfile';

// AD18: the birth date and consent asked of an account that lacks them.
const replace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => replace(path), isLeaving: () => false }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('next=/vi/app/settings') }));
const t = vi_.App.auth;

async function setup(me: ReturnType<typeof makeMe>, patch: Route) {
  let current = me;
  const f = makeFetch({
    'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
    'GET /v1/me': () => Response.json(current),
    'PATCH /v1/me': async (call) => {
      const answer = await patch(call);
      if (answer.ok) current = { ...current, birth_date: '2000-01-02', terms_accepted_at: '2026-10-28T00:00:00.000Z' };
      return answer;
    },
  });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  await store.bootstrap();
  render(
    <NextIntlClientProvider locale="vi" messages={{ App: vi_.App }}>
      <SessionProvider store={store}>
        <CompleteProfile today="2026-10-28" />
      </SessionProvider>
    </NextIntlClientProvider>,
  );
  return f;
}

beforeEach(() => replace.mockReset());

describe('CompleteProfile', () => {
  it('asks only for consent when the birth date exists, sends accept_terms, then goes to next', async () => {
    const f = await setup(makeMe({ terms_accepted_at: null }), () => Response.json({}));
    expect(screen.queryByText(t.register.birthDate)).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: t.complete.submit });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(submit);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/settings'));
    expect(f.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ accept_terms: true });
  });

  it('a birth date under 13 shows the sign-up message and does not leave', async () => {
    await setup(makeMe({ birth_date: null }), () => problem(400, 'age-below-minimum'));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(t.register.birthDate)).toBeInTheDocument();
  });
});
