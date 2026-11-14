export type MaskTarget = { lemma: string; variants: string[]; inflections: Array<{ form: string }> };
export type MaskedExample = { masked: string; blank: string; base: boolean };

type Token = { text: string; start: number; end: number; sentenceStart: boolean };
type FormToken = { text: string; start: number; end: number };

// Tokens are runs of letters, digits and apostrophes; curly apostrophes count as straight ones.
const tokenPattern = /[\p{L}\p{N}'‘’]+/gu;
const straight = (text: string) => text.replace(/[‘’]/g, "'");
const collapse = (text: string) => text.replace(/\s+/g, ' ');
const stripPunctuation = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
// A "." right after one of these does not end a sentence.
const abbreviations = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'sr', 'jr', 'vs', 'etc']);

function formTokens(form: string): FormToken[] {
  return [...straight(form).matchAll(tokenPattern)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
}

function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of sentence.matchAll(tokenPattern)) {
    const start = match.index;
    let gap = sentence.slice(last, start);
    const previous = tokens[tokens.length - 1];
    if (previous && abbreviations.has(previous.text.toLowerCase())) gap = gap.replace(/^\./, '');
    tokens.push({ text: straight(match[0]), start, end: start + match[0].length,
      sentenceStart: tokens.length === 0 || /[.!?]/.test(gap) });
    last = start + match[0].length;
  }
  return tokens;
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Finds the target word in an example and replaces every match with `___` (Bước 4 design 7.4b, R7). Matching is
 * case-sensitive except a capital first letter at the start of a sentence, so `March` is not `march`. A multi-word form
 * matches its words in order with only the form's own separators between them (`ice, cream` is not `ice cream`). A
 * possessive (`student's`, `students'`) matches on its stem and only the stem is masked. A form ending in punctuation
 * (`a.m.`) takes that punctuation with it when the sentence has it. Returns null when nothing matches or the matches are
 * not all the same word.
 */
export function maskExample(sentence: string, target: MaskTarget): MaskedExample | null {
  const base = [target.lemma, ...target.variants];
  // A variant that is the lemma without its punctuation ("am" for "a.m.") would mask the ordinary word, so it is not used.
  const usable = target.lemma.includes('.')
    ? base.filter((form) => form === target.lemma || stripPunctuation(form) !== stripPunctuation(target.lemma))
    : base;
  // Longest forms first, so "looks after" wins over a single-word form starting at the same token.
  const forms = [...new Set([...usable, ...target.inflections.map(({ form }) => form)])]
    .map((form) => {
      const parts = formTokens(form);
      const text = straight(form);
      const trailing = parts.length > 0 ? text.slice(parts[parts.length - 1].end).trim() : '';
      return { form, parts, text, trailing };
    })
    .filter(({ parts }) => parts.length > 0)
    .sort((a, b) => b.parts.length - a.parts.length);
  const tokens = tokenize(sentence);
  const plain = straight(sentence);
  const matches: Array<{ form: string; start: number; end: number }> = [];
  for (let i = 0; i < tokens.length;) {
    let end = 0;
    const found = forms.find(({ parts, text, trailing }) => {
      const lastIndex = parts.length - 1;
      const ok = parts.every((part, k) => {
        const token = tokens[i + k];
        if (!token) return false;
        if (k > 0) {
          const between = collapse(sentence.slice(tokens[i + k - 1].end, token.start));
          if (between !== collapse(text.slice(parts[k - 1].end, part.start))) return false;
        }
        const initial = k === 0 && token.sentenceStart;
        if (token.text === part.text || (initial && token.text === capitalized(part.text))) { end = token.end; return true; }
        if (k === lastIndex) {
          const stem = token.text.endsWith("'s") ? token.text.slice(0, -2) : token.text.endsWith("'") ? token.text.slice(0, -1) : null;
          if (stem !== null && (stem === part.text || (initial && stem === capitalized(part.text)))) {
            end = token.start + stem.length;
            return true;
          }
        }
        return false;
      });
      if (ok && trailing && plain.startsWith(trailing, end)) end += trailing.length;
      return ok;
    });
    if (!found) { i++; continue; }
    matches.push({ form: found.form, start: tokens[i].start, end });
    i += found.parts.length;
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
