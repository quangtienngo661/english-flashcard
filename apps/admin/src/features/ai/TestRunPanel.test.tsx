import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, rateLimited } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { URL, configRoutes, configsView, draftView } from './configs/config-test-support';
import { evalExample, heldOutExample, quota, succeeded } from './prompt-test-support';

const t = vi.ai.prompts.test;
const runButton = () => screen.getByRole('button', { name: t.run });
const posts = (calls: { method: string; path: string; body: unknown }[]) => calls.filter((c) => c.method === 'POST' && c.path.endsWith('/drafts/C4/test'));
const quotaLine = (remaining: number) => t.quota.replace('{remaining}', String(remaining)).replace('{limit}', '20');

/** The "Chạy thử" panel sits in the draft editor of the configs page: it tests the saved draft. */
async function openPage(over: Parameters<typeof configRoutes>[0] = {}) {
  const r = renderApp('/ai/configs/drafts/C4', configRoutes({ [URL.configs()]: () => Response.json(configsView({ draft: draftView() })), ...over }));
  await screen.findByRole('button', { name: t.run }, { timeout: 4000 });
  return r;
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vitest.useRealTimers());

describe('Chạy thử on the configs page (A/82, M2-T6)', () => {
  it('reads the quota on open and again after a run; sends no example_ids when none is chosen (the saved draft is what runs)', async () => {
    let remaining = 17;
    const r = await openPage({
      [URL.quota]: () => Response.json(quota(remaining)),
      [URL.testDraft()]: () => {
        remaining -= 1;
        return Response.json({ items: [succeeded('go')] });
      },
    });
    expect(await screen.findByText(quotaLine(17))).toBeInTheDocument();
    await userEvent.click(runButton());
    expect(await screen.findByText('They ___ (go) out.', { exact: false })).toBeInTheDocument();
    expect(await screen.findByText(quotaLine(16))).toBeInTheDocument();
    expect(posts(r.calls)[0]!.body).toMatchObject({ snapshot: { model_ref: 'M1' } });
    expect(r.count('GET', '/v1/admin/ai/test-quota')).toBe(2);
  });

  it('§6.4 "Chạy với:": the draft\'s own examples when the example set is empty', async () => {
    await openPage();
    expect(await screen.findByText(vi.ai.workspace.noSelection)).toBeInTheDocument();
  });

  it('§6.4 "Chạy với:" with a set: first five, then the chosen ones; example_ids sent; at most 5 can be chosen', async () => {
    const set = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((w, i) => evalExample(`00000000-0000-4000-8000-00000000000${i}`, `word-${w}`));
    const r = await openPage({
      [URL.examples()]: () => Response.json({ items: set }),
      [URL.testDraft()]: () => Response.json({ items: [succeeded('word-a')] }),
    });
    await userEvent.click(screen.getByRole('button', { name: vi.ai.workspace.pickDev }));
    for (const w of ['a', 'c', 'd', 'e', 'f']) await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(`word-${w}`) }));
    expect(screen.getAllByText(vi.ai.workspace.chosen.replace('{count}', '5'))[0]).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /word-g/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /word-f/ }));
    expect(screen.getAllByText(vi.ai.workspace.chosen.replace('{count}', '4'))[0]).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: vi.common.close }));
    await userEvent.click(runButton());
    await screen.findByText(t.sample.replace('{n}', '1'));
    expect((posts(r.calls)[0]!.body as { example_ids: string[] }).example_ids).toEqual([set[0]!.id, set[2]!.id, set[3]!.id, set[4]!.id]);
  });

  it('nhóm B M1: only dev examples are offered; a held-out id in the list is neither a checkbox nor counted in "Chạy với"', async () => {
    const r = await openPage({
      [URL.examples()]: () => Response.json({ items: [evalExample('00000000-0000-4000-8000-000000000001', 'word-a'), heldOutExample('00000000-0000-4000-8000-000000000002')] }),
      [URL.testDraft()]: () => Response.json({ items: [succeeded('word-a')] }),
    });
    await userEvent.click(screen.getByRole('button', { name: vi.ai.workspace.pickDev }));
    const group = await screen.findByRole('dialog', { name: t.pick });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(group).getByRole('checkbox', { name: /word-a/ })).toBeInTheDocument();
    await userEvent.click(within(group).getByRole('button', { name: vi.common.close }));
    await userEvent.click(runButton());
    await screen.findByText(t.sample.replace('{n}', '1'));
    expect(posts(r.calls)[0]!.body).toMatchObject({ snapshot: { model_ref: 'M1' } });
  });

  it('nhóm B M1: a list with nothing but held-out examples reads as an empty set to pick from', async () => {
    await openPage({ [URL.examples()]: () => Response.json({ items: [heldOutExample('00000000-0000-4000-8000-000000000002')] }) });
    await userEvent.click(screen.getByRole('button', { name: vi.ai.workspace.pickDev }));
    expect(await screen.findByText(vi.ai.workspace.noMatches)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: vi.common.close }));
    expect(screen.getByText(vi.ai.workspace.noSelection)).toBeInTheDocument();
  });

  it('§6.4: 409 model-not-set → says the draft has no model, with no link (the model box is on the same page)', async () => {
    await openPage({ [URL.testDraft()]: () => problem(409, 'model-not-set') });
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.ai.configs.draft.noModelToTest)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.openConfigs })).not.toBeInTheDocument();
  });

  it('§6.4: 429 → "Đã dùng hết 20 lần chạy thử trong giờ này. Thử lại lúc 15:00." from Retry-After; the quota is read again; the button stays usable', async () => {
    vitest.useFakeTimers({ toFake: ['Date'] });
    vitest.setSystemTime(new Date('2026-10-27T07:30:00.000Z')); // 14:30 in Asia/Ho_Chi_Minh
    const r = await openPage({ [URL.testDraft()]: () => rateLimited(1800) });
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
    await openPage({ [URL.testDraft()]: () => Response.json({ items: [succeeded('go'), failed, succeeded('run')] }) });
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
      [URL.testDraft()]: () => {
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

  it('a failed quota read or example-set read says so under the button instead of staying silent', async () => {
    await openPage({
      [URL.quota]: () => problem(500, 'internal-error'),
      [URL.examples()]: () => problem(500, 'internal-error'),
    });
    expect(await screen.findByText(t.quotaFailed)).toBeInTheDocument();
    expect(await screen.findByText(t.examplesFailed)).toBeInTheDocument();
    expect(runButton()).toBeEnabled();
  });

  it('a double press sends one request', async () => {
    let release: () => void = () => {};
    const r = await openPage({
      [URL.testDraft()]: () => new Promise<Response>((resolve) => {
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
      [URL.configs()]: () => Response.json(configsView({ draft: draftView({ examples: [] }) })),
      [URL.testDraft()]: () => problem(400, 'validation-failed', { violations: ['examples: at least one example is needed'] }),
    });
    await userEvent.click(runButton());
    expect(await screen.findByText(t.needExample)).toBeInTheDocument();
  });

  it('temporary snapshot runs remain enabled for unsaved form content', async () => {
    await openPage();
    expect(screen.getByText(vi.ai.workspace.temporaryNote)).toBeInTheDocument();
    const box = screen.getByLabelText(vi.ai.prompts.instructions);
    await userEvent.clear(box);
    await userEvent.click(box);
    await userEvent.paste('Unsaved.');
    expect(runButton()).toBeEnabled();
  });
});
