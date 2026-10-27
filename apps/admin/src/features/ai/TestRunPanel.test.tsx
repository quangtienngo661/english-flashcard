import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, rateLimited } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { URL, evalExample, example, promptRoutes, promptView, quota, succeeded } from './prompt-test-support';

const t = vi.ai.prompts.test;
const runButton = () => screen.getByRole('button', { name: t.run });
const posts = (calls: { method: string; path: string; body: unknown }[]) => calls.filter((c) => c.method === 'POST' && c.path.endsWith('/test'));
const quotaLine = (remaining: number) => t.quota.replace('{remaining}', String(remaining)).replace('{limit}', '20');

async function openPage(over: Parameters<typeof promptRoutes>[0] = {}) {
  const r = renderApp('/ai/prompts', promptRoutes(over));
  await screen.findByRole('button', { name: t.run });
  return r;
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vitest.useRealTimers());

describe('Chạy thử on the Prompt page (A/82)', () => {
  it('reads the quota on open and again after a run; sends the text on screen (unsaved) and no example_ids when none is chosen', async () => {
    let remaining = 17;
    const r = await openPage({
      [URL.quota]: () => Response.json(quota(remaining)),
      [URL.test()]: () => {
        remaining -= 1;
        return Response.json({ items: [succeeded('go')] });
      },
    });
    expect(await screen.findByText(quotaLine(17))).toBeInTheDocument();
    const box = screen.getByLabelText(vi.ai.prompts.instructions);
    await userEvent.clear(box);
    await userEvent.click(box);
    await userEvent.paste('Unsaved draft.');
    await userEvent.click(runButton());
    expect(await screen.findByText('They ___ (go) out.', { exact: false })).toBeInTheDocument();
    expect(await screen.findByText(quotaLine(16))).toBeInTheDocument();
    expect(posts(r.calls)[0].body).toEqual({ instructions: 'Unsaved draft.', examples: [example()] });
    expect(r.count('GET', '/v1/admin/ai/test-quota')).toBe(2);
  });

  it('§6.4 "Chạy với:": the prompt\'s own examples when the example set is empty', async () => {
    await openPage();
    expect(await screen.findByText(t.withPrompt)).toBeInTheDocument();
  });

  it('§6.4 "Chạy với:" with a set: first five, then the chosen ones; example_ids sent; at most 5 can be chosen', async () => {
    const set = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((w, i) => evalExample(`00000000-0000-4000-8000-00000000000${i}`, `word-${w}`));
    const r = await openPage({
      [URL.examples()]: () => Response.json({ items: set }),
      [URL.test()]: () => Response.json({ items: [succeeded('word-a')] }),
    });
    expect(await screen.findByText(t.withFirst.replace('{count}', '5'))).toBeInTheDocument();
    for (const w of ['a', 'c', 'd', 'e', 'f']) await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(`word-${w}`) }));
    expect(screen.getByText(t.withSelected.replace('{count}', '5'))).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /word-g/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /word-f/ }));
    expect(screen.getByText(t.withSelected.replace('{count}', '4'))).toBeInTheDocument();
    await userEvent.click(runButton());
    await screen.findByText(vi.ai.prompts.test.sample.replace('{n}', '1'));
    expect((posts(r.calls)[0].body as { example_ids: string[] }).example_ids).toEqual([set[0].id, set[2].id, set[3].id, set[4].id]);
  });

  it('§6.4: 409 model-not-set → the copy and a link to Thao tác', async () => {
    await openPage({ [URL.test()]: () => problem(409, 'model-not-set') });
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.errors['model-not-set'])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.openOperations })).toHaveAttribute('href', '/ai/operations');
  });

  it('§6.4: 429 → "Đã dùng hết 20 lần chạy thử trong giờ này. Thử lại lúc 15:00." from Retry-After; the quota is read again; the button stays usable', async () => {
    vitest.useFakeTimers({ toFake: ['Date'] });
    vitest.setSystemTime(new Date('2026-10-27T07:30:00.000Z')); // 14:30 in Asia/Ho_Chi_Minh
    const r = await openPage({ [URL.test()]: () => rateLimited(1800) });
    await screen.findByText(quotaLine(17));
    await userEvent.click(runButton());
    expect(await screen.findByText('Đã dùng hết 20 lần chạy thử trong giờ này. Thử lại lúc 15:00.')).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/test-quota')).toBe(2));
    expect(runButton()).toBeEnabled();
  });

  it('§6.4: one sample that failed shows its status and reason while the others show their output', async () => {
    const failed = {
      ...succeeded('come'), status: 'transient_failure' as const, reason: 'invalid-shape', output: null,
      calls: [{ attempt: 1 as const, outcome: 'invalid-shape', latency_ms: 500, cost_usd: null, http_status: 200 }],
    };
    await openPage({ [URL.test()]: () => Response.json({ items: [succeeded('go'), failed, succeeded('run')] }) });
    await userEvent.click(runButton());
    const second = await screen.findByRole('group', { name: t.sample.replace('{n}', '2') });
    expect(within(second).getByText(t.statuses.transient_failure)).toBeInTheDocument();
    expect(within(second).getByText('invalid-shape')).toBeInTheDocument();
    expect(within(second).getByText('"word": "come"', { exact: false })).toBeInTheDocument();
    for (const [n, word] of [[1, 'go'], [3, 'run']] as const) {
      const sample = screen.getByRole('group', { name: t.sample.replace('{n}', String(n)) });
      expect(within(sample).getByText(t.statuses.succeeded)).toBeInTheDocument();
      expect(within(sample).getByText(`They ___ (${word}) out.`, { exact: false })).toBeInTheDocument();
    }
  });

  it('Review Focus 2: a network error on [Chạy thử] says so and is not sent again; the quota is read again', async () => {
    const r = await openPage({
      [URL.test()]: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await screen.findByText(quotaLine(17));
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.offline.message)).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/test-quota')).toBe(2));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(posts(r.calls)).toHaveLength(1);
  });

  it('a double press sends one request', async () => {
    let release: () => void = () => {};
    const r = await openPage({
      [URL.test()]: () => new Promise<Response>((resolve) => {
        release = () => resolve(Response.json({ items: [succeeded('go')] }));
      }),
    });
    await userEvent.dblClick(runButton());
    release();
    await screen.findByText(t.sample.replace('{n}', '1'));
    expect(posts(r.calls)).toHaveLength(1);
  });

  it('400 "examples: at least one example is needed" → "Cần ít nhất một ví dụ để chạy thử."', async () => {
    await openPage({
      [URL.prompt()]: () => Response.json(promptView({ examples: [] })),
      [URL.test()]: () => problem(400, 'validation-failed', { violations: ['examples: at least one example is needed'] }),
    });
    await userEvent.click(runButton());
    expect(await screen.findByText(t.needExample)).toBeInTheDocument();
  });
});
