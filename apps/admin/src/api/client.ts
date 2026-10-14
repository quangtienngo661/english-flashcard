import { NetworkError, toApiError } from './problem';

export type Transport = (path: string, init: RequestInit) => Promise<Response>;

export type ApiClient = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  postForm<T>(path: string, form: FormData, opts: { idempotencyKey: string }): Promise<T>;
  getBlob(path: string): Promise<Blob>;
};

export function createApiClient(opts: { send: Transport }): ApiClient {
  async function request(path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await opts.send(path, { ...init, credentials: 'include' });
    } catch (cause) {
      throw new NetworkError(cause);
    }
    if (!res.ok) throw await toApiError(res);
    return res;
  }

  async function json<T>(path: string, init: RequestInit): Promise<T> {
    const res = await request(path, init);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  function jsonInit(method: string, body: unknown, idempotencyKey?: string): RequestInit {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
  }

  return {
    get: (path) => json(path, { method: 'GET', headers: {} }),
    post: (path, body, o) => json(path, jsonInit('POST', body, o?.idempotencyKey)),
    put: (path, body) => json(path, jsonInit('PUT', body)),
    // No Content-Type here: the browser sets multipart/form-data with its boundary.
    postForm: (path, form, o) => json(path, { method: 'POST', headers: { 'Idempotency-Key': o.idempotencyKey }, body: form }),
    getBlob: async (path) => (await request(path, { method: 'GET', headers: {} })).blob(),
  };
}
