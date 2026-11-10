// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { renderApp } from '@/app-ui/test-utils';
import { useLastSession, type LastSessionView } from './last-session';

const LAST: LastSessionView = {
  id: 'ps-1',
  group_id: 'g-tech',
  local_date: '2026-11-07',
  last_answer_at: '2026-11-07T09:12:00.000Z',
  finished: true,
  questions: 20,
  correct: 14,
  wrong_count: 6,
  wrong_lemmas: ['deteriorate', 'allocate', 'viable', 'scrutiny'],
};

function Probe() {
  const q = useLastSession();
  if (q.isError) return <p>error</p>;
  if (q.isPending) return <p>pending</p>;
  return <p>{q.data === null ? 'null' : JSON.stringify(q.data)}</p>;
}

describe('useLastSession (GET /v1/practice/sessions/last)', () => {
  it('204 gives null', async () => {
    renderApp(<Probe />);
    expect(await screen.findByText('null')).toBeInTheDocument();
  });

  it('200 gives the exact object', async () => {
    renderApp(<Probe />, { routes: { 'GET /v1/practice/sessions/last': () => Response.json(LAST) } });
    expect(await screen.findByText(JSON.stringify(LAST))).toBeInTheDocument();
  });

  it('500 is an error', async () => {
    renderApp(<Probe />, {
      routes: {
        'GET /v1/practice/sessions/last': () =>
          new Response(JSON.stringify({ type: 'about:blank', title: 'Server error', status: 500 }), {
            status: 500,
            headers: { 'content-type': 'application/problem+json' },
          }),
      },
    });
    expect(await screen.findByText('error')).toBeInTheDocument();
  });
});
