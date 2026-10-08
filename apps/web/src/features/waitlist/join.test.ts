import { handleJoin } from './join';
import { createMemoryStore } from './memory-store';
import type { WaitlistState, WaitlistStore } from './store';

const idle: WaitlistState = { status: 'idle' };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries({ locale: 'vi', ...fields })) data.set(k, v);
  return data;
}

describe('handleJoin', () => {
  it('LP14 invalid email → invalid_email, email echoed, nothing stored', async () => {
    const store = createMemoryStore();
    expect(await handleJoin(store, idle, form({ email: 'ten@gmail', consent: 'on' }))).toEqual({ status: 'invalid_email', email: 'ten@gmail' });
    expect(store.list()).toEqual([]);
  });

  it('LP15 missing consent → missing_consent, nothing stored', async () => {
    const store = createMemoryStore();
    expect(await handleJoin(store, idle, form({ email: 'ten@gmail.com' }))).toEqual({ status: 'missing_consent', email: 'ten@gmail.com' });
    expect(store.list()).toEqual([]);
  });

  it('LP16 valid → success, store has the normalized email', async () => {
    const store = createMemoryStore();
    expect(await handleJoin(store, idle, form({ email: 'ten@gmail.com', consent: 'on' }))).toEqual({ status: 'success' });
    expect(store.list()).toEqual(['ten@gmail.com']);
  });

  it('LP17 same email again → success, one record', async () => {
    const store = createMemoryStore();
    await handleJoin(store, idle, form({ email: 'ten@gmail.com', consent: 'on' }));
    expect(await handleJoin(store, idle, form({ email: 'ten@gmail.com', consent: 'on' }))).toEqual({ status: 'success' });
    expect(store.list()).toEqual(['ten@gmail.com']);
  });

  it('LP18 honeypot filled → success, nothing stored', async () => {
    const store = createMemoryStore();
    expect(await handleJoin(store, idle, form({ email: 'bot@spam.com', consent: 'on', company: 'ACME' }))).toEqual({ status: 'success' });
    expect(store.list()).toEqual([]);
  });

  it('LP19 store throws → error, email echoed', async () => {
    const failing: WaitlistStore = { add: async () => Promise.reject(new Error('down')) };
    expect(await handleJoin(failing, idle, form({ email: 'ten@gmail.com', consent: 'on' }))).toEqual({ status: 'error', email: 'ten@gmail.com' });
  });

  it('Review Focus 2: store failure is logged without the email', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing: WaitlistStore = { add: async () => Promise.reject(new TypeError('D1_ERROR')) };
    await handleJoin(failing, idle, form({ email: 'secret@gmail.com', consent: 'on' }));
    expect(spy).toHaveBeenCalledWith('waitlist_store_failed', { error: 'TypeError' });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret@gmail.com');
    spy.mockRestore();
  });

  it('LPE7 "  Foo@Example.COM " stored as foo@example.com', async () => {
    const store = createMemoryStore();
    await handleJoin(store, idle, form({ email: '  Foo@Example.COM ', consent: 'on' }));
    expect(store.list()).toEqual(['foo@example.com']);
  });

  it('Review#4 255-character address → invalid_email', async () => {
    const store = createMemoryStore();
    const email = `${'a'.repeat(64)}@${'b'.repeat(180)}.example.com`.slice(0, 255);
    expect(email.length).toBe(255);
    expect((await handleJoin(store, idle, form({ email, consent: 'on' }))).status).toBe('invalid_email');
  });

  it('LPE6 two concurrent identical submits leave one record', async () => {
    const store = createMemoryStore();
    await Promise.all([1, 2].map(() => handleJoin(store, idle, form({ email: 'ten@gmail.com', consent: 'on' }))));
    expect(store.list()).toEqual(['ten@gmail.com']);
  });

  it('an unknown locale is rejected as invalid input without storing', async () => {
    const store = createMemoryStore();
    expect((await handleJoin(store, idle, form({ email: 'ten@gmail.com', consent: 'on', locale: 'fr' }))).status).toBe('error');
    expect(store.list()).toEqual([]);
  });
});
