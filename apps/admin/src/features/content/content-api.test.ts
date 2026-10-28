import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../api/client';
import {
  cancelPublishJob,
  createPublishJob,
  createSource,
  createUpload,
  downloadPublishReport,
  downloadRejected,
  exportSenses,
  getPublishJob,
  getUpload,
  LEVELS,
  listPublishJobs,
  listSources,
  listTopics,
  listUploads,
  revertUpload,
  VALID_POS,
} from './content-api';

type Seen = { path: string; init: RequestInit };

function setup(reply: () => Response = () => Response.json({})) {
  const seen: Seen[] = [];
  const api = createApiClient({
    send: async (path, init) => {
      seen.push({ path, init });
      return reply();
    },
  });
  return { api, seen };
}

describe('content-api', () => {
  it('constants: 6 levels and 15 parts of speech, copied from the API', () => {
    expect(LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(VALID_POS).toHaveLength(15);
    expect(VALID_POS).toContain('modal auxiliary');
  });

  it('listSources unwraps items; createSource posts the body', async () => {
    const { api, seen } = setup(() => Response.json({ items: [{ id: 's1' }] }));
    expect(await listSources(api)).toEqual([{ id: 's1' }]);
    expect(seen[0].path).toBe('/v1/admin/content/sources');

    const body = { name: 'CEFR-J', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 };
    await createSource(api, body);
    expect(seen[1].path).toBe('/v1/admin/content/sources');
    expect(seen[1].init.method).toBe('POST');
    expect(JSON.parse(String(seen[1].init.body))).toEqual(body);
  });

  it('listUploads: page_size and the page token', async () => {
    const { api, seen } = setup();
    await listUploads(api);
    await listUploads(api, 'tok 1');
    expect(seen[0].path).toBe('/v1/admin/content/uploads?page_size=20');
    expect(seen[1].path).toBe('/v1/admin/content/uploads?page_size=20&page_token=tok+1');
  });

  it('createUpload: multipart with the file, level_source_id only when given, and the Idempotency-Key', async () => {
    const { api, seen } = setup();
    const file = new File(['pos,headword\nnoun,cat\n'], 'a.csv', { type: 'text/csv' });
    await createUpload(api, file, null, 'key-1');
    await createUpload(api, file, 'src-9', 'key-2');
    const [a, b] = seen.map((s) => s.init.body as FormData);
    expect(seen[0].path).toBe('/v1/admin/content/uploads');
    expect((seen[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe('key-1');
    expect((a.get('file') as File).name).toBe('a.csv');
    expect(a.has('level_source_id')).toBe(false);
    expect(b.get('level_source_id')).toBe('src-9');
    expect((seen[1].init.headers as Record<string, string>)['Idempotency-Key']).toBe('key-2');
  });

  it('batch: get, revert (POST with key), rejected.csv as a blob', async () => {
    const { api, seen } = setup(() => new Response('a,b\n', { headers: { 'content-type': 'text/csv' } }));
    await getUpload(api, 'b1').catch(() => undefined);
    await revertUpload(api, 'b1', 'k').catch(() => undefined);
    const blob = await downloadRejected(api, 'b1');
    expect(seen.map((s) => `${s.init.method} ${s.path}`)).toEqual([
      'GET /v1/admin/content/uploads/b1',
      'POST /v1/admin/content/uploads/b1/revert',
      'GET /v1/admin/content/uploads/b1/rejected.csv',
    ]);
    expect((seen[1].init.headers as Record<string, string>)['Idempotency-Key']).toBe('k');
    expect(await blob.text()).toBe('a,b\n');
  });

  it('exportSenses: only the filters that have a value reach the query string', async () => {
    const { api, seen } = setup(() => new Response('x'));
    await exportSenses(api, { status: 'unpublishable', level: '', pos: undefined, topic: 'food', batch_id: '' });
    expect(seen[0].path).toBe('/v1/admin/content/senses/export?status=unpublishable&topic=food');
    await exportSenses(api, {});
    expect(seen[1].path).toBe('/v1/admin/content/senses/export');
  });

  it('listTopics unwraps items', async () => {
    const { api, seen } = setup(() => Response.json({ items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] }));
    expect((await listTopics(api))[0].code).toBe('food');
    expect(seen[0].path).toBe('/v1/admin/taxonomy/topics');
  });

  it('publish jobs: create posts { filter } with the key; list, get and report.csv', async () => {
    const { api, seen } = setup(() => new Response('r'));
    await createPublishJob(api, { batch_id: 'b1' }, 'k9').catch(() => undefined);
    await listPublishJobs(api, 'p').catch(() => undefined);
    await getPublishJob(api, 'j1').catch(() => undefined);
    await downloadPublishReport(api, 'j1');
    expect(JSON.parse(String(seen[0].init.body))).toEqual({ filter: { batch_id: 'b1' } });
    expect((seen[0].init.headers as Record<string, string>)['Idempotency-Key']).toBe('k9');
    expect(seen.map((s) => s.path)).toEqual([
      '/v1/admin/content/senses/publish-jobs',
      '/v1/admin/content/senses/publish-jobs?page_size=20&page_token=p',
      '/v1/admin/content/senses/publish-jobs/j1',
      '/v1/admin/content/senses/publish-jobs/j1/report.csv',
    ]);
  });

  it('cancelPublishJob: POST .../publish-jobs/:id/cancel, no body and no Idempotency-Key, returns the job', async () => {
    const { api, seen } = setup(() => Response.json({ id: 'j1', status: 'failed', cancelled: true }));
    expect(await cancelPublishJob(api, 'j1')).toEqual({ id: 'j1', status: 'failed', cancelled: true });
    expect(seen[0].path).toBe('/v1/admin/content/senses/publish-jobs/j1/cancel');
    expect(seen[0].init.method).toBe('POST');
    expect(seen[0].init.body).toBeUndefined();
    expect((seen[0].init.headers as Record<string, string>)['Idempotency-Key']).toBeUndefined();
  });
});
