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
    // QA5: the button stays on; a press without the tick says why under the box and focuses it.
    await userEvent.click(submit);
    const box = screen.getByRole('checkbox');
    await waitFor(() => expect(box).toHaveFocus());
    expect(box).toHaveAccessibleDescription(t.required.consent);
    expect(f.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
    await userEvent.click(box);
    await userEvent.click(submit);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/settings'));
    expect(f.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ accept_terms: true });
  });

  it('QA5: with neither birth date nor consent, an empty press names both and focuses the date', async () => {
    const f = await setup(makeMe({ birth_date: null, terms_accepted_at: null }), () => Response.json({}));
    await userEvent.click(screen.getByRole('button', { name: t.complete.submit }));
    const date = screen.getByLabelText(t.register.birthDate);
    await waitFor(() => expect(date).toHaveFocus());
    expect(date).toHaveAccessibleDescription(t.required.birthDate);
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(t.required.consent);
    expect(f.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
  });

  it('legal documents: an outdated consent says the terms were updated, asks only for consent and sends accept_terms', async () => {
    const f = await setup(makeMe({ terms_version: '1', terms_outdated: true }), () => Response.json({}));
    expect(screen.getByRole('heading', { name: t.complete.updatedTitle })).toBeInTheDocument();
    expect(screen.getByText(t.complete.updatedBody)).toBeInTheDocument();
    expect(screen.queryByText(t.register.birthDate)).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: t.complete.submit });
    expect(submit).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(submit);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/settings'));
    expect(f.calls.find((c) => c.method === 'PATCH')!.body).toEqual({ accept_terms: true });
  });

  it('the first consent keeps the original title (nothing was updated)', async () => {
    await setup(makeMe({ terms_accepted_at: null }), () => Response.json({}));
    expect(screen.getByRole('heading', { name: t.complete.title })).toBeInTheDocument();
    expect(screen.queryByText(t.complete.updatedBody)).not.toBeInTheDocument();
  });

  it('a birth date under 13 shows the sign-up message and does not leave', async () => {
    await setup(makeMe({ birth_date: null }), () => problem(400, 'age-below-minimum'));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(t.register.birthDate)).toBeInTheDocument();
  });
});
