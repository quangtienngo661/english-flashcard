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

// Practice AI count (09/11/2026, design §5): the learner's AI count K replaces the type ratio when the start body sends `ai_count`.

/** Round-1 AI questions for K: all K in a one-round session, else round(K × kept ÷ target); later rounds hold the rest. */
export function roundOneAiLimit(aiCount: number, targetCount: number, kept: number): number {
  if (targetCount <= kept) return aiCount;
  return Math.round((aiCount * kept) / targetCount);
}

/**
 * Round-1 words marked for AI under random placement, in `kept` order: the AI-capable words with an unseen AI question first (in `kept`
 * order), then the other capable words drawn at random until `limit`.
 */
export function markAiSensesRandom(kept: string[], aiCapable: Set<string>, withUnseen: Set<string>, limit: number,
  random: () => number): string[] {
  const capable = kept.filter((id) => aiCapable.has(id));
  const marked = new Set(capable.filter((id) => withUnseen.has(id)).slice(0, Math.max(0, limit)));
  const rest = capable.filter((id) => !marked.has(id));
  while (marked.size < limit && rest.length > 0) marked.add(rest.splice(Math.floor(random() * rest.length), 1)[0]);
  return kept.filter((id) => marked.has(id));
}

/** The session's AI questions for K: the marked round-1 words plus one per later-round slot, never above K. */
export function plannedFromCount(aiCount: number, marked: number, kept: number, targetCount: number): number {
  return Math.min(aiCount, marked + Math.max(0, targetCount - kept));
}

/**
 * Even placement in rounds ≥ 2: the next question (number answered + 1) is AI while fewer AI questions were placed than
 * round(planned × position ÷ target), or when the questions left are no more than the budget.
 */
export function evenWantsAi(planned: number, budget: number, answered: number, targetCount: number): boolean {
  if (budget <= 0) return false;
  const placed = planned - budget;
  return placed < Math.round((planned * (answered + 1)) / targetCount) || targetCount - answered <= budget;
}
