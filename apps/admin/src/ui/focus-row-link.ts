/**
 * After a detail panel closes (UBE26): focus the visible link of the row that was open, else the page title. A list
 * renders each row twice (table and cards, one hidden by a container query), so the visible one is picked; where
 * nothing has a layout (jsdom) the first match is used.
 */
export function focusRowLink(href: string): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>(`main a[href="${href}"]`)];
  const visible = links.find((a) => a.getClientRects().length > 0);
  (visible ?? links[0] ?? document.getElementById('page-title'))?.focus();
}
