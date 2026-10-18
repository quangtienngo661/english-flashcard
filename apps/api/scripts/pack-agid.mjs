// Packs AGID 2016.01.19 (Kevin Atkinson; notice in THIRD_PARTY_NOTICES.md) into
// src/content/inflections/agid-inflections.json, the library source for inflected forms (D29, D46).
//
// Get infl.txt from https://raw.githubusercontent.com/en-wl/wordlist/v1/agid/infl.txt (its README must say
// "Version 2016.01.19"), then from apps/api: node scripts/pack-agid.mjs <path/to/infl.txt>
//
// Rules (D46): only level-0 forms (entries without a variant number); a whole line is dropped when its part of
// speech is marked '?' or any entry carries ~ < ! ?; every remaining level-0 form is kept in AGID order.
// Adjectives are left out: AGID's comparatives were too often wrong for learners (D46, 17/10/2026).
// Output: { "V": { word: [[3rd person], [-ing], [past], [past participle]] }, "N": { word: [plurals] } }.
import { readFileSync, writeFileSync } from 'node:fs';

const [inflPath] = process.argv.slice(2);
if (!inflPath) throw new Error('usage: node scripts/pack-agid.mjs <infl.txt>');
const MARK = /[~<!?]/;
const data = { V: {}, N: {} };
for (const line of readFileSync(inflPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^(\S+) ([VN])(\??): (.*)$/);
  if (!m) continue;
  const [, word, pos, unsure, rest] = m;
  if (unsure || MARK.test(rest.replace(/\{[^}]*\}/g, ''))) continue;
  const slots = rest.split(' | ').map((slot) => slot.split(', ').map((entry) => {
    const [form, level] = entry.replace(/\s*\{[^}]*\}/g, '').trim().split(' ');
    return level === undefined ? form : null;
  }).filter(Boolean));
  if (pos === 'N') {
    if (slots[0]?.length) data.N[word] = slots[0];
    continue;
  }
  let verb;
  // be: past 1st/3rd sg | past 2nd sg/plural | past participle | -ing | 1st sg | 2nd sg | 3rd sg | plural present.
  if (word === 'be' && slots.length === 8) verb = [slots[6], slots[3], [...slots[0], ...slots[1]], slots[2]];
  else if (slots.length === 4) verb = [slots[3], slots[2], slots[0], slots[1]];
  else if (slots.length === 3) verb = [slots[2], slots[1], slots[0], slots[0]];
  else continue; // other special shapes (wit)
  if (verb.some((forms) => forms.length)) data.V[word] = verb;
}
const out = new URL('../src/content/inflections/agid-inflections.json', import.meta.url);
writeFileSync(out, JSON.stringify(data));
console.log({ verbs: Object.keys(data.V).length, nouns: Object.keys(data.N).length, bytes: readFileSync(out).length });
