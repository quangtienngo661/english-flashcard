import { describe, expect, it, vi } from 'vitest';
import { createApiClient, type Transport } from './client';
import { ApiError, NetworkError } from './problem';

function setup(respond: () => Response | Promise<Response> = () => Response.json({ ok: true })) {
  const send = vi.fn<Transport>(async () => respond());
  return { send, api: createApiClient({ send }) };
}
const headersOf = (init: RequestInit) => init.headers as Record<string, string>;

describe('createApiClient', () => {
  it('get: sends credentials include and parses JSON', async () => {
    const { api, send } = setup(() => Response.json({ a: 1 }));
    await expect(api.get('/v1/me')).resolves.toEqual({ a: 1 });
    expect(send).toHaveBeenCalledWith('/v1/me', expect.objectContaining({ method: 'GET', credentials: 'include' }));
  });

  it('post: JSON body with content-type and the Idempotency-Key header', async () => {
    const { api, send } = setup();
    await api.post('/v1/x', { a: 1 }, { idempotencyKey: 'k-1' });
    const init = send.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(headersOf(init)).toMatchObject({ 'Content-Type': 'application/json', 'Idempotency-Key': 'k-1' });
  });

  it('post without a body sends neither body nor content-type', async () => {
    const { api, send } = setup();
    await api.post('/v1/x/revert');
    const init = send.mock.calls[0][1];
    expect(init.body).toBeUndefined();
    expect(headersOf(init)['Content-Type']).toBeUndefined();
  });

  it('put: JSON body', async () => {
    const { api, send } = setup();
    await api.put('/v1/admin/users/1/staff-role', { staff_role: 'editor' });
    expect(send.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: '{"staff_role":"editor"}' });
  });

  it('put: Idempotency-Key header when given, none when not', async () => {
    const { api, send } = setup();
    await api.put('/v1/x', { a: 1 }, { idempotencyKey: 'k-put' });
    await api.put('/v1/x', { a: 1 });
    expect(headersOf(send.mock.calls[0][1])['Idempotency-Key']).toBe('k-put');
    expect(Object.keys(headersOf(send.mock.calls[1][1]))).not.toContain('Idempotency-Key');
  });

  it('patch: sends PATCH, a JSON body and the Idempotency-Key header', async () => {
    const { api, send } = setup();
    await api.patch('/x', { b: 2 }, { idempotencyKey: 'k' });
    const init = send.mock.calls[0][1];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe('{"b":2}');
    expect(headersOf(init)).toMatchObject({ 'Content-Type': 'application/json', 'Idempotency-Key': 'k' });
  });

  it('delete: sends DELETE with no body, the Idempotency-Key header, and resolves undefined on 204', async () => {
    const { api, send } = setup(() => new Response(null, { status: 204 }));
    await expect(api.delete('/v1/x/1', { idempotencyKey: 'k-del' })).resolves.toBeUndefined();
    const init = send.mock.calls[0][1];
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(headersOf(init)['Idempotency-Key']).toBe('k-del');
    expect(headersOf(init)['Content-Type']).toBeUndefined();
  });

  it('postForm sends Idempotency-Key and no Content-Type header (browser sets the multipart boundary)', async () => {
    const { api, send } = setup();
    const form = new FormData();
    form.append('file', new Blob(['a,b']), 'x.csv');
    await api.postForm('/v1/admin/content/uploads', form, { idempotencyKey: 'k-2' });
    const init = send.mock.calls[0][1];
    expect(init.body).toBe(form);
    const headers = headersOf(init);
    expect(headers['Idempotency-Key']).toBe('k-2');
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('content-type');
  });

  it('a 204 resolves to undefined', async () => {
    const { api } = setup(() => new Response(null, { status: 204 }));
    await expect(api.post('/v1/auth/logout', {})).resolves.toBeUndefined();
  });

  it('getBlob returns the response body as a Blob', async () => {
    const { api } = setup(() => new Response('a,b\n1,2\n', { headers: { 'content-type': 'text/csv' } }));
    const blob = await api.getBlob('/v1/x.csv');
    expect(await blob.text()).toBe('a,b\n1,2\n');
  });

  it('non-2xx → ApiError carrying the problem', async () => {
    const { api } = setup(() =>
      Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'nf' }, { status: 404, headers: { 'content-type': 'application/problem+json' } }),
    );
    await expect(api.get('/v1/x')).rejects.toMatchObject({ problem: { slug: 'not-found', status: 404 } });
    await expect(api.get('/v1/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('non-2xx on getBlob is also an ApiError', async () => {
    const { api } = setup(() => Response.json({ type: 'http://x/problems/export-too-large', status: 400, title: 'x' }, { status: 400 }));
    await expect(api.getBlob('/v1/x')).rejects.toMatchObject({ problem: { slug: 'export-too-large' } });
  });

  it('fetch rejection → NetworkError', async () => {
    const { api } = setup(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(api.get('/v1/x')).rejects.toBeInstanceOf(NetworkError);
  });
});
