import type { InflectionKind } from '../../src/content/index.js';

/** Task 4 acceptance fixture: 30 irregular verbs (incl. go, be, have, leave), 10 irregular plurals, 10 adjectives (no forms).
 * Each case lists the first (displayed) form per kind; `a|b` accepts either spelling. A form equal to the lemma is
 * dropped by the generator, so put/cut list no past forms. */
export type IrregularCase = { lemma: string; pos: 'verb' | 'noun' | 'adjective'; forms: Array<[InflectionKind, string]> };

const verb = (lemma: string, third: string, ing: string, past: string, pp: string): IrregularCase => ({
  lemma, pos: 'verb', forms: ([['third_person', third], ['present_participle', ing], ['past', past], ['past_participle', pp]] as
    Array<[InflectionKind, string]>).filter(([, form]) => form !== lemma),
});

export const IRREGULAR_CASES: IrregularCase[] = [
  verb('go', 'goes', 'going', 'went', 'gone'), verb('be', 'is', 'being', 'was', 'been'),
  verb('have', 'has', 'having', 'had', 'had'), verb('leave', 'leaves', 'leaving', 'left', 'left'),
  verb('run', 'runs', 'running', 'ran', 'run'), verb('come', 'comes', 'coming', 'came', 'come'),
  verb('become', 'becomes', 'becoming', 'became', 'become'), verb('eat', 'eats', 'eating', 'ate', 'eaten'),
  verb('write', 'writes', 'writing', 'wrote', 'written'), verb('take', 'takes', 'taking', 'took', 'taken'),
  verb('give', 'gives', 'giving', 'gave', 'given'), verb('see', 'sees', 'seeing', 'saw', 'seen'),
  verb('know', 'knows', 'knowing', 'knew', 'known'), verb('begin', 'begins', 'beginning', 'began', 'begun'),
  verb('swim', 'swims', 'swimming', 'swam', 'swum'), verb('buy', 'buys', 'buying', 'bought', 'bought'),
  verb('think', 'thinks', 'thinking', 'thought', 'thought'), verb('make', 'makes', 'making', 'made', 'made'),
  verb('find', 'finds', 'finding', 'found', 'found'), verb('tell', 'tells', 'telling', 'told', 'told'),
  verb('speak', 'speaks', 'speaking', 'spoke', 'spoken'), verb('break', 'breaks', 'breaking', 'broke', 'broken'),
  verb('choose', 'chooses', 'choosing', 'chose', 'chosen'), verb('drive', 'drives', 'driving', 'drove', 'driven'),
  verb('fly', 'flies', 'flying', 'flew', 'flown'), verb('sing', 'sings', 'singing', 'sang', 'sung'),
  verb('put', 'puts', 'putting', 'put', 'put'), verb('cut', 'cuts', 'cutting', 'cut', 'cut'),
  verb('teach', 'teaches', 'teaching', 'taught', 'taught'), verb('forget', 'forgets', 'forgetting', 'forgot', 'forgotten'),
  ...Object.entries({ mouse: 'mice', child: 'children', leaf: 'leaves', man: 'men', woman: 'women', foot: 'feet',
    tooth: 'teeth', person: 'people', knife: 'knives', life: 'lives' })
    .map(([lemma, plural]): IrregularCase => ({ lemma, pos: 'noun', forms: [['plural', plural]] })),
  // D46 (coordinator, 17/10/2026): adjectives get no library forms. AGID's comparatives were ~23% wrong on CEFR-J
  // (beautifuler, carefuller, …) and a 1–2 syllable rule still left 92.1% < 95%; reviewed CSV forms are the only source.
  ...['good', 'bad', 'big', 'happy', 'far', 'hot', 'large', 'easy', 'thin', 'old']
    .map((lemma): IrregularCase => ({ lemma, pos: 'adjective', forms: [] })),
];
