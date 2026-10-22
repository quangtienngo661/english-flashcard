// Copied from apps/admin/src/auth/session-store.ts (design §4.2); differences: no staff gate (any account enters the
// learner app), the profile carries name and birth date, `register`, and web's own channel and storage names.
import type { Transport } from '@/app-shell/api/client';
import { problemSlug, toApiError } from '@/app-shell/api/problem';

export type Me = {
  id: string;
  email: string;
  email_verified: boolean;
  must_change_password: boolean;
  native_language: 'vi' | 'en' | null;
  timezone: string;
  staff_role: 'admin' | 'editor' | null;
  permissions: string[];
  given_name: string | null;
  family_name: string | null;
  birth_date: string | null;
};

export type RegisterBody = {
  email: string;
  password: string;
  given_name: string;
  family_name?: string;
  birth_date: string;
  timezone: string;
  accept_terms: true;
};

/** `expired`: E3 "Bạn cần đăng nhập lại."; `rate-limited`: E4 (unlike admin, the login screen says so). */
export type Notice = 'expired' | 'rate-limited' | 'logout-failed';

/** FE38: set while a user-initiated sign-out has not reached the server, so a reload does not quietly resume the session. */
export const LOGOUT_PENDING_KEY = 'wordmet-web-logout-pending';

export type SessionState =
  /** `retryAt`: when the start-up refresh tries again after a 429 (ms since epoch, B25E30). */
  | { status: 'loading'; retryAt?: number }
  | { status: 'signed-out'; notice: Notice | null }
  /** The start-up refresh got a 5xx or no answer: the session is kept, the screen offers a retry (FE36). */
  | { status: 'unavailable' }
  | { status: 'change-password'; me: Me }
  | { status: 'signed-in'; me: Me };

export type ChannelLike = {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  close(): void;
};

export const CHANNEL_NAME = 'wordmet-web-auth';
export const DEVICE = { client: 'web', device_label: 'Wordmet Web' } as const;

type TokenBody = { access_token: string };
type RefreshResult = 'ok' | 'failed' | 'rate-limited' | 'unavailable';

/** B25E30: a refresh answered 429 is tried this many times in all before the session gives up. */
export const REFRESH_TRIES = 3;
/** Wait when a 429 carries no usable `Retry-After`. */
export const REFRESH_RETRY_DEFAULT_S = 10;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class SessionStore {
  state: SessionState = { status: 'loading' };

  private token: string | null = null;
  private readonly listeners = new Set<() => void>();
  private refreshing: Promise<RefreshResult> | null = null;
  private bootstrapping: Promise<void> | null = null;
  /** Between pagehide and pageshow: a refresh rejected now was cut off by the page leaving, not refused (RK8). */
  private leaving = false;

  constructor(
    private readonly opts: {
      baseUrl: string;
      fetch: typeof fetch;
      channel: ChannelLike | null;
      /** How a 429 waits before the next refresh (tests pass an instant one). */
      wait?: (ms: number) => Promise<void>;
      now?: () => number;
    },
  ) {
    window.addEventListener('pagehide', () => {
      this.leaving = true;
    });
    window.addEventListener('pageshow', () => {
      this.leaving = false;
    });
    opts.channel?.addEventListener('message', (event) => {
      const data = event.data as { type?: unknown; failed?: unknown } | null;
      const type = data?.type;
      if (type === 'logout') {
        this.token = null;
        // The sign-out did not reach the server: this tab keeps the pending flag too, so F5 here does not sign back in.
        const failed = data?.failed === true;
        if (failed) setLogoutPending(true);
        this.set({ status: 'signed-out', notice: failed ? 'logout-failed' : null });
      } else if (type === 'login' && this.state.status === 'signed-out') {
        // A sign-in elsewhere supersedes a sign-out that never reached the server.
        setLogoutPending(false);
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

  /** Page start: refresh with the cookie, then `/me`. */
  bootstrap(): Promise<void> {
    this.bootstrapping ??= this.runBootstrap().finally(() => {
      this.bootstrapping = null;
    });
    return this.bootstrapping;
  }

  async login(email: string, password: string): Promise<void> {
    await this.startSession('/v1/auth/login', { email, password, ...DEVICE });
  }

  /** `POST /v1/auth/register` answers like login (token + refresh cookie), so the new account is signed in at once. */
  async register(body: RegisterBody): Promise<void> {
    await this.startSession('/v1/auth/register', { ...body, ...DEVICE });
  }

  private async startSession(path: string, body: unknown): Promise<void> {
    const res = await this.raw(path, json('POST', body), null);
    if (!res.ok) throw await toApiError(res);
    this.token = ((await res.json()) as TokenBody).access_token;
    await this.recheck();
    if (this.state.status === 'signed-in' || this.state.status === 'change-password') {
      setLogoutPending(false);
      this.broadcast({ type: 'login' });
    }
  }

  /** Forced password change (spec §5): the API revokes older sessions and returns a new one. */
  async changePassword(current: string, next: string): Promise<void> {
    const res = await this.authed(
      '/v1/auth/password/change',
      json('POST', { current_password: current, new_password: next }),
    );
    if (!res.ok) throw await toApiError(res);
    this.token = ((await res.json()) as TokenBody).access_token;
    await this.recheck();
  }

  async logout(notice: Notice | null = null): Promise<void> {
    const done = await this.postLogout();
    this.token = null;
    const failed = !done && notice === null;
    if (failed) setLogoutPending(true);
    this.set({ status: 'signed-out', notice: failed ? 'logout-failed' : notice });
    this.broadcast(failed ? { type: 'logout', failed: true } : { type: 'logout' });
  }

  /** Sign-out did not reach the server: ask again. Done → the flag goes and the notice with it. */
  async retryLogout(): Promise<void> {
    const pending = () => this.state.status === 'signed-out' && this.state.notice === 'logout-failed';
    if (!pending()) return;
    if (!(await this.postLogout())) return;
    // A sign-in in another tab may have won meanwhile: then this answer is old news.
    if (!pending()) return;
    setLogoutPending(false);
    this.set({ status: 'signed-out', notice: null });
  }

  /** True when the server has it: 2xx, 401 and 403 mean "no session left"; 429, 5xx and a network error mean the server did nothing. */
  private async postLogout(): Promise<boolean> {
    try {
      const res = await this.raw('/v1/auth/logout', json('POST', {}, this.csrf()), this.token);
      return res.ok || res.status === 401 || res.status === 403;
    } catch {
      return false;
    }
  }

  /** `GET /v1/me`. Any account enters; one a staff member created must change its password first. A failed `/me` leaves the state as it is. */
  async recheck(): Promise<void> {
    const res = await this.authed('/v1/me', { method: 'GET', headers: {} });
    if (!res.ok) return;
    const me = (await res.json()) as Me;
    this.set(me.must_change_password ? { status: 'change-password', me } : { status: 'signed-in', me });
  }

  /** Session-aware transport for the API client: bearer token, shared 401 refresh, 403 `forbidden` → re-read `/me`. */
  send: Transport = async (path, init) => {
    const res = await this.authed(path, init);
    if (res.status === 403) {
      const slug = await slugOf(res);
      if (slug === 'forbidden') {
        const refreshed = await this.refresh();
        if (refreshed === 'ok') await this.recheck();
        else if (refreshed === 'rate-limited') this.giveUpRateLimited();
        else if (refreshed === 'failed') await this.logout('expired');
      } else if (slug === 'password-change-required') {
        await this.recheck();
      }
    }
    return res;
  };

  private async runBootstrap(): Promise<void> {
    if (isLogoutPending()) {
      this.set({ status: 'signed-out', notice: 'logout-failed' });
      return;
    }
    const wasUnavailable = this.state.status === 'unavailable';
    try {
      const refreshed = await this.refresh();
      if (refreshed === 'rate-limited') {
        this.giveUpRateLimited();
        return;
      }
      if (refreshed === 'unavailable') {
        this.set({ status: 'unavailable' });
        return;
      }
      if (refreshed === 'failed') {
        // A retry after "unavailable": the session existed, so say it ended.
        this.set({ status: 'signed-out', notice: wasUnavailable ? 'expired' : null });
        return;
      }
      await this.recheck();
    } catch {
      this.set({ status: 'signed-out', notice: null });
    }
  }

  /** One refresh at a time: concurrent callers share the in-flight promise, and so wait out a 429 together. */
  private refresh(): Promise<RefreshResult> {
    this.refreshing ??= this.runRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  /**
   * B25E30: a 429 does not end the session (the refresh cookie is still good). Wait `Retry-After` seconds (10 without
   * one) and try again; only the third 429 in a row gives up. While the app is still starting, the loading state carries
   * when the next try happens, so the screen can count down.
   */
  private async runRefresh(): Promise<RefreshResult> {
    for (let attempt = 1; ; attempt += 1) {
      let res: Response;
      try {
        res = await this.postRefresh();
      } catch (error) {
        // No answer (offline, server down). Not while the page is leaving: that is the unload, not an outage.
        if (!(error instanceof TypeError) || this.leaving) throw error;
        this.token = null;
        return 'unavailable';
      }
      if (res.ok) {
        this.token = ((await res.json()) as TokenBody).access_token;
        return 'ok';
      }
      this.token = null;
      if (res.status >= 500) return 'unavailable';
      if (res.status !== 429) return 'failed';
      if (attempt >= REFRESH_TRIES) return 'rate-limited';
      const seconds = retryAfterSeconds(res) ?? REFRESH_RETRY_DEFAULT_S;
      if (this.state.status === 'loading') this.set({ status: 'loading', retryAt: (this.opts.now ?? Date.now)() + seconds * 1000 });
      await (this.opts.wait ?? sleep)(seconds * 1000);
    }
  }

  /**
   * keepalive: a reload or page leave mid-refresh must not drop the rotated cookie (2026-10-15-admin-refresh-keepalive-design.md).
   * An engine that rejects keepalive on a preflighted request throws a TypeError before sending: try once more without it (RK8).
   * Not while the page is leaving: that TypeError comes from the unload, the browser still finishes the keepalive refresh, and a
   * second refresh would rotate the token again and lose its answer.
   */
  private async postRefresh(): Promise<Response> {
    const init = json('POST', {}, this.csrf());
    try {
      return await this.raw('/v1/auth/refresh', { ...init, keepalive: true }, null);
    } catch (error) {
      if (!(error instanceof TypeError) || this.leaving) throw error;
      return this.raw('/v1/auth/refresh', init, null);
    }
  }

  /** Rate limited three times: sign out here only. No server logout (it would revoke the still-valid refresh cookie) and no broadcast (other tabs keep their session). */
  private giveUpRateLimited(): void {
    this.token = null;
    this.set({ status: 'signed-out', notice: 'rate-limited' });
  }

  /** Authorized request; a 401 triggers the shared refresh and one retry. */
  private async authed(path: string, init: RequestInit): Promise<Response> {
    const used = this.token;
    const res = await this.raw(path, init, used);
    if (res.status !== 401) return res;
    // Another request may already have refreshed while this one was in flight: then just retry.
    const refreshed: RefreshResult = this.token !== null && this.token !== used ? 'ok' : await this.refresh();
    if (refreshed === 'rate-limited') {
      this.giveUpRateLimited();
      return res;
    }
    if (refreshed === 'failed') {
      await this.logout('expired');
      return res;
    }
    // The API is down, not the session: no logout, no broadcast. The API client turns this into the offline band.
    if (refreshed === 'unavailable') throw new TypeError('refresh unavailable');
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

  private broadcast(message: { type: 'login' | 'logout'; failed?: true }): void {
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

function isLogoutPending(): boolean {
  try {
    return sessionStorage.getItem(LOGOUT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

function setLogoutPending(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(LOGOUT_PENDING_KEY, '1');
    else sessionStorage.removeItem(LOGOUT_PENDING_KEY);
  } catch {
    // Storage blocked: the notice still shows this time, a reload just cannot remember it.
  }
}

function retryAfterSeconds(res: Response): number | null {
  const seconds = Number(res.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

async function slugOf(res: Response): Promise<string> {
  try {
    const body = (await res.clone().json()) as { type?: unknown };
    return typeof body.type === 'string' ? problemSlug(body.type) : '';
  } catch {
    return '';
  }
}
