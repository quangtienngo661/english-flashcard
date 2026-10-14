import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from './download';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saveBlob', () => {
  it('clicks a temporary <a download> with the given name, removes the link, and revokes the object URL on the next tick', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:mock-1');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const clicked: Array<{ href: string; download: string; inDom: boolean }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, inDom: this.isConnected });
    });

    const blob = new Blob(['a,b']);
    saveBlob(blob, 'rejected-abc.csv');

    expect(create).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([{ href: 'blob:mock-1', download: 'rejected-abc.csv', inDom: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled(); // Firefox can cancel a download whose URL is revoked right after click
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:mock-1');
  });
});
