import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { EvalRunDetail } from './ai-api';
import { URL, evalRoutes, evalRun } from './prompt-test-support';

const t = vi.ai.eval;
const PATH = '/ai/eval/runs/r1';
const panel = async () => {
  const heading = await screen.findByRole('heading', { level: 2, name: /^Lần chạy / }, { timeout: 3000 });
  return heading.closest('[data-testid="detail-panel"]') as HTMLElement ?? document.body;
};
const field = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;

afterEach(() => vitest.useRealTimers());

describe('EvalRunPanel (A/83)', () => {
  it('a finished run: status, progress, valid, average time, cost in US$ and ₫ at today’s rate, model, prompt revision, who started it', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun()) }));
    await panel();
    expect(await screen.findByText(/261\s*₫/)).toBeInTheDocument();
    expect(screen.getAllByText(t.status.finished).length).toBeGreaterThan(0);
    expect(field(t.detail.progress)).toHaveTextContent('20/20');
    expect(field(t.detail.valid)).toHaveTextContent('18/20');
    expect(field(t.detail.avgLatency)).toHaveTextContent('812 ms');
    expect(field(t.detail.cost)).toHaveTextContent(/0,01\s*US\$\s*·\s*261\s*₫ theo tỷ giá hôm nay/);
    expect(field(t.detail.model)).toHaveTextContent('OpenAI · gpt-test');
    expect(field(t.detail.prompt)).toHaveTextContent(t.detail.revision.replace('{revision}', '3'));
    expect(field(t.detail.startedBy)).toHaveTextContent('lan@wordmet.com');
  });

  it('a draft run reads "Bản nháp"; without the settings only US$ is shown; calls without a price are counted', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ prompt_revision: null, cost_unknown_count: 2 })),
      [URL.settings]: () => problem(500, ''),
    }));
    await panel();
    await waitFor(() => expect(field(t.detail.prompt)).toHaveTextContent(t.detail.draft));
    expect(field(t.detail.cost)).toHaveTextContent(/0,01\s*US\$/);
    expect(field(t.detail.cost)).not.toHaveTextContent('₫');
    expect(field(t.detail.cost)).toHaveTextContent(t.detail.unknownCost.replace('{count}', '2'));
  });

  it('§6.5: a running run is read again every 2 s and stops once it is finished', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    const replies: Partial<EvalRunDetail>[] = [{ status: 'running', done: 4 }, { status: 'running', done: 12 }, { status: 'finished' }];
    let n = 0;
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(replies[Math.min(n++, replies.length - 1)])) }));
    await panel();
    expect(await screen.findByText(t.detail.running.replace('{done}', '4').replace('{total}', '20'))).toBeInTheDocument();
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    expect(await screen.findByText(t.detail.running.replace('{done}', '12').replace('{total}', '20'))).toBeInTheDocument();
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    await waitFor(() => expect(field(t.detail.progress)).toHaveTextContent('20/20'));
    expect(r.count('GET', '/v1/admin/ai/eval/runs/r1')).toBe(3);
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.count('GET', '/v1/admin/ai/eval/runs/r1')).toBe(3);
  });

  it('§6.5: queued for 31 s → "Chưa có worker nhận lần chạy này."', async () => {
    const created = new Date(Date.now() - 31_000).toISOString();
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: created, started_at: null, finished_at: null })) }));
    expect(await screen.findByText(t.detail.queuedLong)).toBeInTheDocument();
  });

  it('§6.5: a failed run shows "Lỗi" and its error, and is not run again', async () => {
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'failed', done: 3, error: 'worker stopped' })) }));
    const scope = within(await panel());
    expect(await scope.findByText(t.detail.failed.replace('{error}', 'worker stopped'))).toBeInTheDocument();
    expect(scope.getAllByText(t.status.failed).length).toBeGreaterThan(0);
    expect(r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/ai/eval/runs')).toHaveLength(0);
  });

  it('an unknown run (404) says it cannot be read', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => problem(404, 'not-found') }));
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
  });
});
