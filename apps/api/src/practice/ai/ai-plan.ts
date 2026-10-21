// How many AI questions a session plans and which round-1 words get them (design §6.1 steps 3–5, §6.3). Pure; the session
// service supplies the counts.

/**
 * Round-1 words to mark for an AI question, in `kept` order: words with an unseen AI question first, then the other
 * AI-capable words spread evenly so the first marked one is not position 1 (B7E45: 10 words, 5 → 2, 4, 6, 8, 10).
 */
export function markAiSenses(kept: string[], aiCapable: Set<string>, withUnseen: Set<string>, limit: number): string[] {
  const capable = kept.filter((id) => aiCapable.has(id));
  const marked = new Set(capable.filter((id) => withUnseen.has(id)).slice(0, Math.max(0, limit)));
  const rest = capable.filter((id) => !marked.has(id));
  const k = Math.min(Math.max(0, limit - marked.size), rest.length);
  for (let j = 1; j <= k; j++) marked.add(rest[Math.ceil((j * rest.length) / k) - 1]);
  return kept.filter((id) => marked.has(id));
}

/** min(ceil(count × AI types ÷ types), marked + round ≥ 2 slots); errs low (design §6.1 step 4, R5). */
export function aiPlanned(count: number, typesChosen: number, aiTypesChosen: number, marked: number, kept: number): number {
  if (typesChosen === 0 || aiTypesChosen === 0) return 0;
  return Math.min(Math.ceil((count * aiTypesChosen) / typesChosen), marked + Math.max(0, count - kept));
}

/** Units the session must be able to pay: each marked word with an unseen AI question reuses it (design §6.1 step 5). */
export function aiNeeded(planned: number, markedWithUnseen: number): number {
  return Math.max(0, planned - markedWithUnseen);
}

/** r = planned − asked AI items (void included) − requests generating or ready but not yet asked (design §6.3, R9). */
export function aiBudget(planned: number, servedInSession: number, pendingInSession: number): number {
  return Math.max(0, planned - servedInSession - pendingInSession);
}

/** Chance that a round ≥ 2 slot is an AI question when q questions remain (design §6.3). */
export function aiChanceInLaterRound(r: number, q: number): number {
  if (r <= 0 || q <= 0) return 0;
  return Math.min(1, r / q);
}
