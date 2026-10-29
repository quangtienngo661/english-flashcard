import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { problem } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import type { ConfigsView, PublishCheck, PublishWarning } from '../ai-api';
import { evalRun } from '../prompt-test-support';
import { RUN_ID, URL, configRoutes, configView, configsView, draftView, publishCheck } from './config-test-support';

const t = vi.ai.configs;
const CHECK_PATH = '/v1/admin/ai/configs/generate_cloze/publish-check';
const button = (name: string) => screen.getByRole('button', { name });
const calls = (all: { method: string; path: string; body: unknown; headers: Record<string, string> }[], method: string, suffix: string) =>
  all.filter((c) => c.method === method && c.path.endsWith(suffix));

/** The config page after the publish: config 4 is live, config 3 is the one before it, no draft. */
const afterPublish = (): ConfigsView => configsView({
  live: configView({ id: 'C4', number: 4, version: 2 }), live_version: 6, previous: configView(), draft: null,
});

function pageRoutes(check: PublishCheck, over: Parameters<typeof configRoutes>[0] = {}, view: Partial<ConfigsView> = {}) {
  return configRoutes({
    [URL.configs()]: () => Response.json(configsView({ draft: draftView({ version: check.draft.version, number: check.draft.number }), ...view })),
    [URL.publishCheck()]: () => Response.json(check),
    ...over,
  });
}

async function openPage(routes: ReturnType<typeof configRoutes>) {
  const r = renderApp('/ai/configs', routes);
  await screen.findByRole('heading', { name: /^Nháp · cấu hình/ }, { timeout: 4000 });
  return r;
}

const rateDrop = (): PublishWarning => ({ code: 'rate-drop', criterion: 'shape', before: { passed: 20, counted: 20 }, after: { passed: 18, counted: 20 } });
const devRegressed = (): PublishWarning => ({ code: 'dev-regressed', example_ids: ['e1', 'e2'] });

beforeEach(() => sessionStorage.clear());

describe('PublishPanel: what a publish needs (M2-T7)', () => {
  it('without a frozen version it says so, links to Bộ ví dụ and keeps "Publish" off', async () => {
    await openPage(pageRoutes(publishCheck({ set: null, candidate_run_id: null, baseline: { required: true, run_id: null }, blockers: ['eval-required'] })));
    expect(await screen.findByText(t.publish.noSet)).toBeInTheDocument();
    // The menu has a link of the same name: the panel's own is the one under its heading.
    const panel = screen.getByRole('region', { name: t.publish.title });
    expect(within(panel).getByRole('link', { name: vi.nav.aiEval })).toHaveAttribute('href', '/ai/eval?op=generate_cloze');
    expect(button(t.publish.submit)).toBeDisabled();
  });

  it('the draft has no complete run: it says so for that version and offers the run; "Publish" stays off', async () => {
    const r = await openPage(pageRoutes(publishCheck({ candidate_run_id: null, blockers: ['eval-required'] }), {
      [URL.startRun]: () => Response.json({ run_id: RUN_ID, status: 'queued' }, { status: 202 }),
      [URL.run(RUN_ID)]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: new Date().toISOString() })),
    }));
    expect(await screen.findByText(t.publish.evalRequired.replace('{version}', '2'))).toBeInTheDocument();
    expect(button(t.publish.submit)).toBeDisabled();
    await userEvent.click(button(t.draft.runSet));
    await waitFor(() => expect(r.router.state.location.pathname).toBe(`/ai/eval/runs/${RUN_ID}`));
    expect(calls(r.calls, 'POST', '/eval/runs')[0]!.body).toEqual({ operation: 'generate_cloze', set_id: 'S2', config: 'draft' });
  });

  it('the live config has no complete run: it offers a run of the live config on that version, with set_id and config "live"', async () => {
    const r = await openPage(pageRoutes(publishCheck({ baseline: { required: true, run_id: null }, blockers: ['baseline-required'] }), {
      [URL.startRun]: () => Response.json({ run_id: RUN_ID, status: 'queued' }, { status: 202 }),
      [URL.run(RUN_ID)]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: new Date().toISOString() })),
    }));
    expect(await screen.findByText(t.publish.baselineRequired.replace('{version}', '2'))).toBeInTheDocument();
    expect(button(t.publish.submit)).toBeDisabled();
    await userEvent.click(button(t.publish.runLive.replace('{version}', '2')));
    await waitFor(() => expect(r.router.state.location.pathname).toBe(`/ai/eval/runs/${RUN_ID}`));
    const sent = calls(r.calls, 'POST', '/eval/runs');
    expect(sent[0]!.body).toEqual({ operation: 'generate_cloze', set_id: 'S2', config: 'live' });
    expect(sent[0]!.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('warnings are listed with their numbers; "Publish" waits for the checkbox, then sends the acknowledgement and toasts', async () => {
    const r = await openPage(pageRoutes(
      publishCheck({ draft: { id: 'C4', number: 4, version: 2 }, warnings: [rateDrop(), devRegressed()] }),
      { [URL.publish()]: () => Response.json(afterPublish()) },
    ));
    expect(await screen.findByText(t.publish.rateDrop.replace('{criterion}', t.publish.criteria.shape).replace('{before}', '100').replace('{after}', '90'))).toBeInTheDocument();
    expect(screen.getByText(t.publish.devRegressed.replace('{count}', '2'))).toBeInTheDocument();
    expect(button(t.publish.submit)).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: t.publish.acknowledge }));
    expect(button(t.publish.submit)).toBeEnabled();
    await userEvent.click(button(t.publish.submit));
    expect(await screen.findByText(t.publish.done.replace('{number}', '4'))).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/publish')[0]!.body).toEqual({ expected_version: 2, candidate_run_id: 'RC', baseline_run_id: 'RB', acknowledge_warnings: true });
    expect(await screen.findByRole('heading', { name: t.live.title.replace('{number}', '4') })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Nháp ·/ })).not.toBeInTheDocument();
  });

  it('rates are shown with at most one decimal; a held-out rise is shown as two counts and never as examples', async () => {
    await openPage(pageRoutes(publishCheck({
      warnings: [
        { code: 'rate-drop', criterion: 'rule', before: { passed: 6, counted: 7 }, after: { passed: 1, counted: 3 } },
        { code: 'held-out-failures-up', before: 1, after: 3 },
      ],
    })));
    expect(await screen.findByText(t.publish.rateDrop.replace('{criterion}', t.publish.criteria.rule).replace('{before}', '85,7').replace('{after}', '33,3'))).toBeInTheDocument();
    expect(screen.getByText(t.publish.heldOutUp.replace('{before}', '1').replace('{after}', '3'))).toBeInTheDocument();
  });

  it('no warning: no checkbox, "Publish" is on and sends acknowledge_warnings false', async () => {
    const r = await openPage(pageRoutes(publishCheck(), { [URL.publish()]: () => Response.json(afterPublish()) }));
    await waitFor(() => expect(button(t.publish.submit)).toBeEnabled());
    expect(screen.queryByRole('checkbox', { name: t.publish.acknowledge })).not.toBeInTheDocument();
    await userEvent.click(button(t.publish.submit));
    await screen.findByText(t.publish.done.replace('{number}', '4'));
    expect(calls(r.calls, 'POST', '/publish')[0]!.body).toEqual({ expected_version: 0, candidate_run_id: 'RC', baseline_run_id: 'RB', acknowledge_warnings: false });
  });

  it('409 publish-stale says the data changed and reads the check and the configs again', async () => {
    const r = await openPage(pageRoutes(publishCheck(), { [URL.publish()]: () => problem(409, 'publish-stale') }));
    await waitFor(() => expect(button(t.publish.submit)).toBeEnabled());
    await userEvent.click(button(t.publish.submit));
    expect(await screen.findByText(t.publish.stale)).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', CHECK_PATH)).toBeGreaterThanOrEqual(2));
    expect(r.count('GET', '/v1/admin/ai/configs/generate_cloze')).toBeGreaterThanOrEqual(2);
  });

  it('unsaved edits keep "Publish" and the run off and say to save first', async () => {
    await openPage(pageRoutes(publishCheck()));
    await waitFor(() => expect(button(t.publish.submit)).toBeEnabled());
    const box = screen.getByLabelText(vi.ai.prompts.instructions);
    await userEvent.clear(box);
    await userEvent.click(box);
    await userEvent.paste('Edited.');
    expect(button(t.publish.submit)).toBeDisabled();
    expect(button(t.draft.runSet)).toBeDisabled();
    expect(screen.getByText(t.publish.saveFirst)).toBeInTheDocument();
  });
});

describe('PublishPanel: the first model and turning an operation off (D37, D38)', () => {
  it('D37: a live config without a model needs no baseline: it says so, has no checkbox and publishes with baseline_run_id null', async () => {
    const r = await openPage(pageRoutes(
      publishCheck({ turn_off: false, baseline: { required: false, run_id: null }, warnings: [], blockers: [] }),
      { [URL.publish()]: () => Response.json(afterPublish()) },
      { live: configView({ model: null }) },
    ));
    expect(await screen.findByText(t.publish.noBaseline)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: t.publish.acknowledge })).not.toBeInTheDocument();
    await userEvent.click(button(t.publish.submit));
    await screen.findByText(t.publish.done.replace('{number}', '4'));
    expect(calls(r.calls, 'POST', '/publish')[0]!.body).toEqual({ expected_version: 0, candidate_run_id: 'RC', baseline_run_id: null, acknowledge_warnings: false });
  });

  it('B48: a draft without a model turns the operation off after a confirmation; [Hủy] sends nothing', async () => {
    const r = await openPage(pageRoutes(
      publishCheck({ turn_off: true, draft: { id: 'C5', number: 5, version: 1 }, set: null, candidate_run_id: null, baseline: { required: false, run_id: null }, blockers: [], warnings: [] }),
      { [URL.publish()]: () => Response.json(afterPublish()) },
    ));
    expect(await screen.findByText(t.publish.turnOffNote)).toBeInTheDocument();
    expect(screen.queryByText(t.publish.noSet)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.draft.runSet })).not.toBeInTheDocument();
    await userEvent.click(button(t.publish.submit));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.publish.turnOffDialog)).toBeInTheDocument();
    expect(t.publish.turnOffDialog).toBe('Tắt AI của thao tác này? Người học sẽ nhận câu không AI.');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls(r.calls, 'POST', '/publish')).toHaveLength(0);
    await userEvent.click(button(t.publish.submit));
    dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t.publish.turnOffConfirm }));
    expect(await screen.findByText(t.publish.turnedOff.replace('{number}', '5'))).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/publish')).toHaveLength(1);
    expect(calls(r.calls, 'POST', '/publish')[0]!.body).toEqual({ expected_version: 1, candidate_run_id: null, baseline_run_id: null, acknowledge_warnings: false });
  });
});

describe('Rollback (M2-T7)', () => {
  const withPrevious = (over: Partial<ConfigsView> = {}) => configsView({
    live: configView({ id: 'C4', number: 4, version: 1 }), live_version: 7, previous: configView(), ...over,
  });
  const back = () => configsView({ live: configView(), live_version: 8, previous: null });

  it('the button exists only when there is a config before the live one', async () => {
    renderApp('/ai/configs', configRoutes());
    await screen.findByRole('heading', { name: /^Bản đang chạy/ }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: /^Quay về cấu hình/ })).not.toBeInTheDocument();
  });

  it('it asks first (the learners and the draft), then sends expected_live_version and toasts', async () => {
    let live = withPrevious();
    const r = renderApp('/ai/configs', configRoutes({
      [URL.configs()]: () => Response.json(live),
      [URL.rollback()]: () => {
        live = back();
        return Response.json(live);
      },
    }));
    await userEvent.click(await screen.findByRole('button', { name: t.rollback.button.replace('{number}', '3') }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.rollback.confirm.replaceAll('{number}', '3'))).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/rollback')).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: t.rollback.go }));
    expect(await screen.findByText(t.rollback.done.replace('{number}', '3'))).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/rollback')[0]!.body).toEqual({ expected_live_version: 7 });
    expect(await screen.findByRole('heading', { name: t.live.title.replace('{number}', '3') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Quay về cấu hình/ })).not.toBeInTheDocument();
  });

  it.each(['no-previous', 'publish-stale'])('409 %s shows its sentence and reads the configs again', async (slug) => {
    const r = renderApp('/ai/configs', configRoutes({ [URL.configs()]: () => Response.json(withPrevious()), [URL.rollback()]: () => problem(409, slug) }));
    await userEvent.click(await screen.findByRole('button', { name: t.rollback.button.replace('{number}', '3') }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.rollback.go }));
    expect(await screen.findByText((vi.errors as Record<string, string>)[slug]!)).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/configs/generate_cloze')).toBeGreaterThanOrEqual(2));
  });

  it('[Hủy] on the question sends nothing', async () => {
    const r = renderApp('/ai/configs', configRoutes({ [URL.configs()]: () => Response.json(withPrevious()) }));
    await userEvent.click(await screen.findByRole('button', { name: t.rollback.button.replace('{number}', '3') }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls(r.calls, 'POST', '/rollback')).toHaveLength(0);
  });
});
