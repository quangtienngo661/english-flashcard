export function normalizeText(s: string): string {
  return s.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function normalizeLemma(s: string): string {
  return normalizeText(s);
}

export function splitHeadword(head: string): { lemma: string; variants: string[] } {
  const segments = [...new Set(head.split('/').map(normalizeLemma).filter(Boolean))];
  return { lemma: segments[0] ?? '', variants: segments.slice(1) };
}
