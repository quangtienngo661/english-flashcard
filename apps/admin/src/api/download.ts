/** The API needs `Authorization`, so a plain link cannot download: fetch a Blob, then click a temporary link. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick: some browsers (Firefox) cancel the download if the URL dies right after the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
