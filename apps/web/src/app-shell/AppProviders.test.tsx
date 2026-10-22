// @vitest-environment jsdom
import { useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../messages/vi.json';
import { ApiError, NetworkError } from './api/problem';
import { AppProviders } from './AppProviders';
import { SessionStore } from './session/session-store';
import { BASE, makeFetch } from './session/test-support';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('./navigate', () => ({ hardReplace: (path: string) => replace(path) }));

function Failing({ error }: { error: Error }) {
  useQuery({ queryKey: ['x'], queryFn: () => Promise.reject(error) });
  return <p>page</p>;
}

function setup(error: Error) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never;
  const store = new SessionStore({ baseUrl: BASE, fetch: makeFetch({}).fetch, channel: null });
  vi.spyOn(store, 'bootstrap').mockResolvedValue();
  render(
    <NextIntlClientProvider locale="vi" messages={{ App: vi_.App }}>
      <AppProviders store={store}>
        <Failing error={error} />
      </AppProviders>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => replace.mockReset());

describe('AppProviders', () => {
  it('a NetworkError from a query raises the offline band', async () => {
    setup(new NetworkError());
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được. Kiểm tra mạng rồi thử lại.');
  });

  it('E9: 403 profile-incomplete from a query goes to welcome and back', async () => {
    window.history.replaceState(null, '', '/vi/app/groups');
    setup(new ApiError({ type: 'http://api.test/problems/profile-incomplete', slug: 'profile-incomplete', status: 403, title: 'p' }, null));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/vi/app/welcome?next=%2Fvi%2Fapp%2Fgroups'));
  });
});
