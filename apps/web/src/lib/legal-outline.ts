/** A `##` or `###` heading of a legal text, with the id its section is linked by (`#id`). */
export type Heading = { level: 2 | 3; text: string; id: string };

/** The id a heading gets: lower case, Vietnamese marks and đ dropped, words joined by hyphens. */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'section' : slug;
}

/** A heading as it is drawn: without bold marks and link syntax. */
const plain = (raw: string) => raw.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();

/** The `##` and `###` headings in order, each with a unique id. Headings inside a code fence are not headings. */
export function outlineOf(source: string): Heading[] {
  const used = new Map<string, number>();
  const outline: Heading[] = [];
  let fence: string | null = null;
  for (const line of source.split(/\r?\n/)) {
    const marker = /^\s{0,3}(```|~~~)/.exec(line)?.[1];
    if (marker) {
      fence = fence === null ? marker : fence === marker ? null : fence;
      continue;
    }
    if (fence !== null) continue;
    const match = /^ {0,3}(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = plain(match[2]!);
    const base = slugify(text);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    outline.push({ level: match[1]!.length as 2 | 3, text, id: count === 1 ? base : `${base}-${count}` });
  }
  return outline;
}

/** Hands the ids back in the order the headings are drawn, so two headings of one name keep their own id. */
export function headingIds(outline: Heading[]): (text: string) => string {
  const queues = new Map<string, string[]>();
  for (const heading of outline) queues.set(heading.text, [...(queues.get(heading.text) ?? []), heading.id]);
  return (text) => queues.get(text)?.shift() ?? slugify(text);
}

const LABEL = /^\s*\*\*(?:mục lục|table of contents|contents)\*\*\s*:?\s*$/i;
const ITEM = /^(\s*(?:\d+[.)]|[-*+])\s+)(.+?)\s*$/;
const keyOf = (text: string) => text.replace(/^\d+[.)]\s*/, '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Turns the list under a hand-written `**Mục lục**` line into links to the sections of the same name (the number in front is
 * ignored), plus the single line right under the list when it names a section. Anything that matches no section stays text.
 */
export function linkContents(source: string, outline: Heading[]): string {
  const start = source.split('\n').findIndex((line) => LABEL.test(line));
  if (start === -1) return source;
  const lines = source.split('\n');
  const ids = new Map<string, string>();
  for (const heading of outline) if (!ids.has(keyOf(heading.text))) ids.set(keyOf(heading.text), heading.id);
  const link = (text: string) => {
    const id = /[[\]]/.test(text) ? undefined : ids.get(keyOf(text));
    return id ? `[${text}](#${id})` : null;
  };
  let i = start + 1;
  for (; i < lines.length; i += 1) {
    const item = ITEM.exec(lines[i]!);
    if (!item) break;
    const linked = link(item[2]!);
    if (linked) lines[i] = item[1]! + linked;
  }
  const after = lines[i + 1];
  const alone = lines[i + 2] === undefined || lines[i + 2]!.trim() === '';
  if (lines[i]?.trim() === '' && after !== undefined && after.trim() !== '' && !ITEM.test(after) && !/^\s{0,3}#/.test(after) && alone) {
    const linked = link(after.trim());
    if (linked) lines[i + 1] = linked;
  }
  return lines.join('\n');
}
