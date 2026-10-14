import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from './download';

afterEach(() => vi.restoreAllMocks());

describe('saveBlob', () => {
  it('clicks a temporary <a download> with the given name, then revokes the object URL and removes the link', () => {
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
    expect(revoke).toHaveBeenCalledWith('blob:mock-1');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
