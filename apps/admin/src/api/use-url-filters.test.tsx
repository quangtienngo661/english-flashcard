import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useUrlFilters } from './use-url-filters';

const SPEC = {
  status: { default: 'open', valid: (v: string) => ['open', 'resolved'].includes(v) },
  source: { default: 'all', valid: (v: string) => ['all', 'ai', 'user'].includes(v) },
};

type Change = { status?: string; source?: string };
let pending: Change = {};

function Probe() {
  const [filters, setFilters] = useUrlFilters<{ status: string; source: string }>(SPEC);
  const location = useLocation();
  return (
    <>
      <output data-testid="values">{JSON.stringify(filters)}</output>
      <output data-testid="url">{location.pathname + location.search}</output>
      <button onClick={() => setFilters(pending)}>apply</button>
    </>
  );
}

function mount(url: string) {
  const router = createMemoryRouter([{ path: '/reports', element: <Probe /> }], { initialEntries: [url] });
  const actions: string[] = [];
  router.subscribe((state) => actions.push(state.historyAction));
  render(<RouterProvider router={router} />);
  return actions;
}

const values = () => JSON.parse(screen.getByTestId('values').textContent!) as Record<string, string>;
const url = () => screen.getByTestId('url').textContent;
async function set(change: Change) {
  pending = change;
  await userEvent.click(screen.getByText('apply'));
}

describe('useUrlFilters', () => {
  it('drops an invalid value (default instead) and removes it from the URL without a history entry', async () => {
    const actions = mount('/reports?status=foo&source=ai');
    expect(values()).toEqual({ status: 'open', source: 'ai' });
    await act(async () => {});
    expect(url()).toBe('/reports?source=ai');
    expect(actions).toEqual(['REPLACE']);
  });

  it('keeps search params it does not own, when it drops an invalid value and when it writes', async () => {
    mount('/reports?tab=x&status=foo');
    await act(async () => {});
    expect(url()).toBe('/reports?tab=x');
    await set({ source: 'ai' });
    expect(url()).toBe('/reports?tab=x&source=ai');
  });

  it('writing a filter pushes exactly one history entry, and a default value is not written', async () => {
    const actions = mount('/reports');
    expect(values()).toEqual({ status: 'open', source: 'all' });
    await set({ status: 'resolved' });
    expect(url()).toBe('/reports?status=resolved');
    expect(actions).toEqual(['PUSH']);
    await set({ status: 'open' });
    expect(url()).toBe('/reports');
    expect(actions).toEqual(['PUSH', 'PUSH']);
  });

  it('never stores page_token: a filter change removes it', async () => {
    mount('/reports?status=resolved&page_token=abc');
    await set({ source: 'user' });
    expect(url()).toBe('/reports?status=resolved&source=user');
  });

  it('does not write an invalid value', async () => {
    mount('/reports');
    await set({ status: 'foo' });
    expect(url()).toBe('/reports');
  });
});
