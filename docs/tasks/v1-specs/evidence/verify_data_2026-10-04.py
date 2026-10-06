# Chạy: python verify_data_2026-10-04.py   (đọc 2 file CSV trong docs/preparation/evidence/wordlists_2026-10-02/)
import csv, collections, os, sys
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'preparation', 'evidence', 'wordlists_2026-10-02')
a = list(csv.DictReader(open(os.path.join(base, 'cefrj-vocabulary-profile-1.5.csv'), encoding='utf-8')))
b = list(csv.DictReader(open(os.path.join(base, 'octanove-vocabulary-profile-c1c2-1.0.csv'), encoding='utf-8')))
def out(*x): print(*x)
out('R1 rows: cefrj', len(a), 'octanove', len(b), '| cols:', list(a[0].keys()), list(b[0].keys()))
k = lambda r: (r['headword'].strip().lower(), r['pos'].strip().lower())
A = collections.defaultdict(set); B = collections.defaultdict(set)
for r in a: A[k(r)].add(r['CEFR'])
for r in b: B[k(r)].add(r['CEFR'])
ov = set(A) & set(B)
out('R2 raw lowercased (headword,pos) pairs in both sources:', len(ov), '| with different level:', sum(1 for x in ov if A[x] != B[x]))
# entry key per PR3: first form before '/', trimmed, case-sensitive for identity; lowercase only for this overlap count
first = lambda h: h.strip().split('/')[0].strip().lower()
A2 = collections.defaultdict(set); B2 = collections.defaultdict(set)
for r in a: A2[(first(r['headword']), r['pos'].strip().lower())].add(r['CEFR'])
for r in b: B2[(first(r['headword']), r['pos'].strip().lower())].add(r['CEFR'])
ov2 = set(A2) & set(B2)
out('R2b cross-source pairs under first-slash-form key:', len(ov2), '| different level:', sum(1 for x in ov2 if A2[x] != B2[x]))
cnt = collections.Counter(k(r) for r in a)
out('R3 cefrj duplicate lowercased keys:', [x for x, c in cnt.items() if c > 1], '| rows:', [(r['headword'], r['pos'], r['CEFR']) for r in a if r['headword'].lower() == 'march'])
out('R4 multiword headwords: cefrj', sum(' ' in r['headword'].strip() for r in a), 'octanove (after trim)', sum(' ' in r['headword'].strip() for r in b),
    '| octanove with stray spaces:', [r['headword'] for r in b if r['headword'] != r['headword'].strip()])
out('R5 cefrj headwords with uppercase:', sum(any(c.isupper() for c in r['headword']) for r in a))
out('R6 slash headwords: cefrj', sum('/' in r['headword'] for r in a), 'octanove', sum('/' in r['headword'] for r in b))
FW = {'pronoun', 'preposition', 'determiner', 'conjunction', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb', 'infinitive-to'}
out('R7 function-word rows: cefrj', sum(r['pos'].strip().lower() in FW for r in a), 'octanove', sum(r['pos'].strip().lower() in FW for r in b),
    '| cefrj by pos:', {p: sum(r['pos'] == p for r in a) for p in sorted(FW)}, '| number', sum(r['pos'] == 'number' for r in a), 'interjection', sum(r['pos'] == 'interjection' for r in a))
valid = {'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'determiner', 'interjection', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb', 'infinitive-to'}
out('R8 octanove rows with invalid pos:', [(r['headword'], r['pos']) for r in b if r['pos'].strip().lower() not in valid])
oc = collections.defaultdict(list)
for r in b: oc[k(r)].append(r)
d = {x: v for x, v in oc.items() if len(v) > 1}
out('R46 octanove duplicate (headword,pos) keys:', len(d), '| extra rows:', sum(len(v) - 1 for v in d.values()),
    '| same level:', sum(1 for v in d.values() if len({r['CEFR'] for r in v}) == 1), '| different level:', sum(1 for v in d.values() if len({r['CEFR'] for r in v}) > 1))
out('R46b octanove rows with a non-empty notes column:', sum(1 for r in b if (r.get('notes') or '').strip()))
ex = [(x, [(r['CEFR'], r.get('notes', '')) for r in v]) for x, v in d.items() if len({r['CEFR'] for r in v}) > 1][:3]
out('R46c examples of conflicting duplicates:', ex)
out('R47 CEFR-J row analyze/analyse:', [(r['headword'], r['pos'], r['CEFR']) for r in a if r['headword'].startswith('analyze')])
