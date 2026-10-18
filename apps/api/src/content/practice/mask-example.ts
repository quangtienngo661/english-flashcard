export type MaskTarget = { lemma: string; variants: string[]; inflections: Array<{ form: string }> };
export type MaskedExample = { masked: string; blank: string; base: boolean };

type Token = { text: string; start: number; end: number; sentenceStart: boolean };

// Tokens are runs of letters and apostrophes; curly apostrophes count as straight ones.
const tokenPattern = /[\p{L}'‘’]+/gu;
const straight = (text: string) => text.replace(/[‘’]/g, "'");
const words = (text: string) => [...straight(text).matchAll(tokenPattern)].map(([word]) => word);

function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of sentence.matchAll(tokenPattern)) {
    const start = match.index;
    tokens.push({ text: straight(match[0]), start, end: start + match[0].length,
      sentenceStart: tokens.length === 0 || /[.!?]/.test(sentence.slice(last, start)) });
    last = start + match[0].length;
  }
  return tokens;
}

/**
 * Finds the target word in an example and replaces every match with `___` (Bước 4 design 7.4b, R7). Matching is
 * case-sensitive except a capital first letter at the start of a sentence, so `March` is not `march`. A multi-word form
 * matches its words in order and adjacent. Returns null when nothing matches or the matches are not all the same word.
 */
export function maskExample(sentence: string, target: MaskTarget): MaskedExample | null {
  const base = [target.lemma, ...target.variants];
  // Longest forms first, so "looks after" wins over a single-word form starting at the same token.
  const forms = [...new Set([...base, ...target.inflections.map(({ form }) => form)])]
    .map((form) => ({ form, words: words(form) }))
    .filter(({ words: parts }) => parts.length > 0)
    .sort((a, b) => b.words.length - a.words.length);
  const tokens = tokenize(sentence);
  const matches: Array<{ form: string; start: number; end: number }> = [];
  for (let i = 0; i < tokens.length;) {
    const found = forms.find(({ words: parts }) => parts.every((part, k) => {
      const token = tokens[i + k];
      if (!token) return false;
      return token.text === part || (k === 0 && token.sentenceStart && token.text === part.charAt(0).toUpperCase() + part.slice(1));
    }));
    if (!found) { i++; continue; }
    matches.push({ form: found.form, start: tokens[i].start, end: tokens[i + found.words.length - 1].end });
    i += found.words.length;
  }
  if (matches.length === 0 || matches.some(({ form }) => form !== matches[0].form)) return null;
  let masked = '';
  let last = 0;
  for (const { start, end } of matches) {
    masked += sentence.slice(last, start) + '___';
    last = end;
  }
  const blank = matches[0].form;
  return { masked: masked + sentence.slice(last), blank, base: base.includes(blank) };
}
