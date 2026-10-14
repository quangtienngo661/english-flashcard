import type { Transport } from '../api/client';
import { problemSlug, toApiError } from '../api/problem';
import { gate } from './gate';

export type Permission = 'roles.manage' | 'content.edit' | 'content.publish' | 'content.import' | 'taxonomy.manage';

export type Me = {
  id: string;
  email: string;
  email_verified: boolean;
  native_language: 'vi' | 'en' | null;
  timezone: string;
  staff_role: 'admin' | 'editor' | null;
  permissions: Permission[];
};

export type Notice = 'no-access' | 'expired' | 'verified';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out'; notice: Notice | null }
  | { status: 'verify-email'; me: Me }
  | { status: 'signed-in'; me: Me };

export type ChannelLike = {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  close(): void;
};

export const CHANNEL_NAME = 'wordmet-admin-auth';
const DEVICE = { client: 'web', device_label: 'Wordmet Admin' } as const;

type TokenBody = { access_token: string };

export class SessionStore {
  state: SessionState = { status: 'loading' };

  private token: string | null = null;
  private readonly listeners = new Set<() => void>();
  private refreshing: Promise<boolean> | null = null;
  private bootstrapping: Promise<void> | null = null;

  constructor(
    private readonly opts: { baseUrl: string; fetch: typeof fetch; channel: ChannelLike | null },
  ) {
    opts.channel?.addEventListener('message', (event) => {
      const type = (event.data as { type?: unknown } | null)?.type;
      if (type === 'logout') {
        this.token = null;
        this.set({ status: 'signed-out', notice: null });
      } else if (type === 'login' && this.state.status === 'signed-out') {
        void this.bootstrap();
      }
    });
  }

  get hasAccessToken(): boolean {
    return this.token !== null;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Page start (spec §5): refresh with the cookie, then `/me` and the gate rule. */
  bootstrap(): Promise<void> {
    this.bootstrapping ??= this.runBootstrap().finally(() => {
      this.bootstrapping = null;
    });
    return this.bootstrapping;
  }

  async login(email: string, password: string): Promise<void> {
    await this.startSession('/v1/auth/login', { email, password, ...DEVICE });
  }

  async register(email: string, password: string, timezone: string): Promise<void> {
    await this.startSession('/v1/auth/register', { email, password, timezone, ...DEVICE });
  }

  async verifyEmail(code: string): Promise<void> {
    const res = await this.authed('/v1/auth/verify-email', json('POST', { code }));
    if (!res.ok) throw await toApiError(res);
    await this.logout('verified');
  }

  async logout(notice: Notice | null = null): Promise<void> {
    try {
      await this.raw('/v1/auth/logout', json('POST', {}, this.csrf()), this.token);
    } catch {
      // The local session ends either way; the server-side chain expires on its own.
    }
    this.token = null;
    this.set({ status: 'signed-out', notice });
    this.broadcast({ type: 'logout' });
  }

  /** `GET /v1/me` + gate rule. A failed `/me` leaves the state as it is. */
  async recheck(): Promise<void> {
    const res = await this.authed('/v1/me', { method: 'GET', headers: {} });
    if (!res.ok) return;
    const me = (await res.json()) as Me;
    const next = gate(me);
    if (next === 'app') this.set({ status: 'signed-in', me });
    else if (next === 'verify-email') this.set({ status: 'verify-email', me });
    else await this.logout('no-access');
  }

  /** Session-aware transport for the API client: bearer token, shared 401 refresh, 403 `forbidden` gate. */
  send: Transport = async (path, init) => {
    const res = await this.authed(path, init);
    if (res.status === 403 && (await slugOf(res)) === 'forbidden') {
      if (await this.refresh()) await this.recheck();
      else await this.logout('expired');
    }
    return res;
  };

  private async runBootstrap(): Promise<void> {
    try {
      if (!(await this.refresh())) {
        this.set({ status: 'signed-out', notice: null });
        return;
      }
      await this.recheck();
    } catch {
      this.set({ status: 'signed-out', notice: null });
    }
  }

  private async startSession(path: string, body: unknown): Promise<void> {
    const res = await this.raw(path, json('POST', body), null);
    if (!res.ok) throw await toApiError(res);
    this.token = ((await res.json()) as TokenBody).access_token;
    await this.recheck();
    if (this.state.status === 'signed-in' || this.state.status === 'verify-email') this.broadcast({ type: 'login' });
  }

  /** One refresh at a time: concurrent callers share the in-flight promise. */
  private refresh(): Promise<boolean> {
    this.refreshing ??= this.runRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async runRefresh(): Promise<boolean> {
    const res = await this.raw('/v1/auth/refresh', json('POST', {}, this.csrf()), null);
    if (!res.ok) {
      this.token = null;
      return false;
    }
    this.token = ((await res.json()) as TokenBody).access_token;
    return true;
  }

  /** Authorized request; a 401 triggers the shared refresh and one retry. */
  private async authed(path: string, init: RequestInit): Promise<Response> {
    const used = this.token;
    const res = await this.raw(path, init, used);
    if (res.status !== 401) return res;
    // Another request may already have refreshed while this one was in flight: then just retry.
    const refreshed = this.token !== null && this.token !== used ? true : await this.refresh();
    if (!refreshed) {
      await this.logout('expired');
      return res;
    }
    return this.raw(path, init, this.token);
  }

  private raw(path: string, init: RequestInit, token: string | null): Promise<Response> {
    const headers = { ...(init.headers as Record<string, string> | undefined) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.opts.fetch(`${this.opts.baseUrl}${path}`, { ...init, headers, credentials: 'include' });
  }

  private csrf(): Record<string, string> {
    return { 'X-CSRF-Protection': '1' };
  }

  private broadcast(message: { type: 'login' | 'logout' }): void {
    try {
      this.opts.channel?.postMessage(message);
    } catch {
      // B25E13: a blocked channel is ignored; other tabs find out on their next API call.
    }
  }

  private set(state: SessionState): void {
    this.state = state;
    this.listeners.forEach((l) => l());
  }
}

function json(method: string, body: unknown, extra: Record<string, string> = {}): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) };
}

async function slugOf(res: Response): Promise<string> {
  try {
    const body = (await res.clone().json()) as { type?: unknown };
    return typeof body.type === 'string' ? problemSlug(body.type) : '';
  } catch {
    return '';
  }
}
