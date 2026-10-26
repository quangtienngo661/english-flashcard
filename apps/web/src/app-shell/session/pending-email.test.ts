// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingEmail, clearPendingPassword, readPendingEmail, setPendingPassword, readPendingPassword, writePendingEmail } from './pending-email';

const KEY = 'wordmet-web.pending-email';

beforeEach(() => {
  sessionStorage.clear();
  clearPendingEmail();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearPendingEmail();
});

describe('pending email', () => {
  it('reads, writes and clears the pending email', () => {
    expect(readPendingEmail()).toBeNull();
    writePendingEmail('lan@example.com');
    expect(sessionStorage.getItem(KEY)).toBe('lan@example.com');
    expect(readPendingEmail()).toBe('lan@example.com');
    clearPendingEmail();
    expect(readPendingEmail()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('tolerates sessionStorage methods throwing and still clears the password', () => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
    }
    expect(readPendingEmail()).toBeNull();
    expect(() => writePendingEmail('lan@example.com')).not.toThrow();
    setPendingPassword('a-long-password');
    expect(() => clearPendingEmail()).not.toThrow();
    expect(readPendingPassword()).toBeNull();
  });

  it.each(['missing', 'throwing'])('tolerates a %s sessionStorage global', (mode) => {
    if (mode === 'missing') vi.stubGlobal('sessionStorage', undefined);
    else vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('Storage access denied');
    });
    expect(readPendingEmail()).toBeNull();
    expect(() => writePendingEmail('lan@example.com')).not.toThrow();
    setPendingPassword('a-long-password');
    expect(() => clearPendingEmail()).not.toThrow();
    expect(readPendingPassword()).toBeNull();
  });

  it('keeps the password only in memory until it is cleared', () => {
    writePendingEmail('lan@example.com');
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    expect(readPendingPassword()).toBeNull();
    setPendingPassword('a-long-password');
    expect(persist).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.key(0)).toBe(KEY);
    expect(sessionStorage.getItem(KEY)).toBe('lan@example.com');
    expect(JSON.stringify(sessionStorage)).not.toContain('a-long-password');
    expect(readPendingPassword()).toBe('a-long-password');
    expect(readPendingPassword()).toBe('a-long-password');
    clearPendingPassword();
    expect(readPendingPassword()).toBeNull();
  });

  it('clearPendingEmail also clears the in-memory password', () => {
    writePendingEmail('lan@example.com');
    setPendingPassword('a-long-password');
    clearPendingEmail();
    expect(readPendingEmail()).toBeNull();
    expect(readPendingPassword()).toBeNull();
  });
});
