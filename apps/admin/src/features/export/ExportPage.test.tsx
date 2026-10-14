import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { topicLabel } from './ExportPage';

const saveBlob = vitest.hoisted(() => vitest.fn());
vitest.mock('../../api/download', () => ({ saveBlob }));

const t = vi.export;
const TOPICS = {
  items: [
    { code: 'food', names: { vi: 'Ăn uống', en: 'Food' }, archived_at: null },
    { code: 'travel', names: { en: 'Travel' }, archived_at: null },
    { code: 'misc', names: {}, archived_at: null },
    { code: 'old', names: { vi: 'Cũ' }, archived_at: '2026-01-01T00:00:00.000Z' },
  ],
};
const UPLOADS = { items: [{ id: 'b1', status: 'succeeded', file_name: 'cefr-j-1.5.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null };
const csv = () => new Response('sense_id\n1\n', { headers: { 'content-type': 'text/csv' } });

function open(exportRoutes: Record<string, () => Response>) {
  return renderApp('/export', {
    'GET /v1/admin/taxonomy/topics': () => Response.json(TOPICS),
    'GET /v1/admin/content/uploads?page_size=20': () => Response.json(UPLOADS),
    ...exportRoutes,
  });
}

async function choose(label: string, option: RegExp | string) {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(label) }));
  const list = await screen.findByRole('listbox');
  await userEvent.click(within(list).getByRole('option', { name: option }));
}

beforeEach(() => saveBlob.mockClear());
afterEach(() => vitest.useRealTimers());

describe('export page', () => {
  it('export: chosen filters become the query string, empty ones are omitted, the blob is saved as senses-<yyyy-mm-dd>.csv (local date)', async () => {
    vitest.useFakeTimers({ toFake: ['Date'] });
    vitest.setSystemTime(new Date(2026, 9, 14, 23, 45)); // local 14/10/2026 23:45, whatever the zone
    const r = open({ 'GET /v1/admin/content/senses/export?status=unpublishable&level=B1&topic=food': csv });
    await choose(t.status, t.statuses.unpublishable);
    await choose(t.level, 'B1');
    await choose(t.topic, /Ăn uống \(food\)/);
    await userEvent.click(screen.getByRole('button', { name: t.download }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    const [blob, name] = saveBlob.mock.calls[0] as [Blob, string];
    expect(name).toBe('senses-2026-10-14.csv');
    expect(await blob.text()).toBe('sense_id\n1\n');
    expect(r.count('GET', '/v1/admin/content/senses/export?status=unpublishable&level=B1&topic=food')).toBe(1);
  }, 20_000);

  it('with nothing chosen the request has no query string', async () => {
    const r = open({ 'GET /v1/admin/content/senses/export': csv });
    await userEvent.click(await screen.findByRole('button', { name: t.download }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    expect(r.count('GET', '/v1/admin/content/senses/export')).toBe(1);
  });

  it('a batch and a part of speech are passed as batch_id and pos', async () => {
    const r = open({ 'GET /v1/admin/content/senses/export?pos=modal+auxiliary&batch_id=b1': csv });
    await choose(t.pos, 'modal auxiliary');
    await choose(t.batch, /cefr-j-1\.5\.csv/);
    await userEvent.click(screen.getByRole('button', { name: t.download }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    expect(r.count('GET', '/v1/admin/content/senses/export?pos=modal+auxiliary&batch_id=b1')).toBe(1);
  }, 20_000);

  it('B25E12: export-too-large → the "narrow the filter" message, nothing saved, the button works again', async () => {
    open({ 'GET /v1/admin/content/senses/export': () => problem(400, 'export-too-large') });
    await userEvent.click(await screen.findByRole('button', { name: t.download }));
    expect(await screen.findByText(vi.errors['export-too-large'])).toBeInTheDocument();
    expect(saveBlob).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: t.download })).toBeEnabled();
  });
});

describe('topicLabel', () => {
  it('topics: names in the UI language, falling back to en then code; archived topics marked', () => {
    const [food, travel, misc, old] = TOPICS.items;
    expect(topicLabel(food, 'vi', 'archived')).toBe('Ăn uống (food)');
    expect(topicLabel(food, 'en', 'archived')).toBe('Food (food)');
    expect(topicLabel(travel, 'vi', 'archived')).toBe('Travel (travel)');
    expect(topicLabel(misc, 'vi', 'archived')).toBe('misc');
    expect(topicLabel(old, 'vi', 'archived')).toBe('Cũ (old) · archived');
  });
});
