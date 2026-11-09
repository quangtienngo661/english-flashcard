import { blockPronunciation, type Pronunciation } from './pronunciation';

const pron = (uk: string | null, us: string | null, custom: string | null = null): Pronunciation => ({ uk, us, custom, audio: { uk: null, us: null } });
const sense = (id: string, p: Pronunciation | undefined, scope: 'catalog' | 'private' = 'catalog') => ({ sense_id: id, scope, pronunciation: p });

describe('blockPronunciation (đợt C §5.3, DC13)', () => {
  it('one reading for the block: the first sense gives the shared line, no sense gets its own', () => {
    const block = blockPronunciation([sense('a', pron('ˈrek.ɔːd', 'ˈrek.ɚd')), sense('b', pron('ˈrek.ɔːd', 'ˈrek.ɚd'))]);
    expect(block.shared).toEqual({ scope: 'catalog', pronunciation: pron('ˈrek.ɔːd', 'ˈrek.ɚd') });
    expect([...block.perSense.keys()]).toEqual([]);
  });

  it('lead: a sense read differently from the first gets its own line', () => {
    const block = blockPronunciation([sense('lead-1', pron('liːd', 'liːd')), sense('lead-2', pron('led', 'led')), sense('lead-3', pron('liːd', 'liːd'))]);
    expect(block.shared?.pronunciation.uk).toBe('liːd');
    expect([...block.perSense.keys()]).toEqual(['lead-2']);
    expect(block.perSense.get('lead-2')?.pronunciation.uk).toBe('led');
  });

  it('a sense with no IPA beside one with IPA gets its own line (speakers only)', () => {
    const block = blockPronunciation([sense('a', pron('ˈbʊk', 'ˈbʊk')), sense('b', pron(null, null))]);
    expect([...block.perSense.keys()]).toEqual(['b']);
  });

  it("the learner's own sense in a catalog block shows its own one-line IPA", () => {
    const block = blockPronunciation([sense('a', pron('ˈfəʊ.bi.ə', 'ˈfoʊ.bi.ə')), sense('mine', pron(null, null, 'ˈfoʊ.bi.ə'), 'private')]);
    expect(block.perSense.get('mine')).toEqual({ scope: 'private', pronunciation: pron(null, null, 'ˈfoʊ.bi.ə') });
  });

  it('an older API without pronunciation: a shared line with no IPA, nothing per sense', () => {
    const block = blockPronunciation([sense('a', undefined), sense('b', undefined)]);
    expect(block.shared).toEqual({ scope: 'catalog', pronunciation: pron(null, null) });
    expect(block.perSense.size).toBe(0);
  });

  it('an empty block has no line', () => {
    expect(blockPronunciation([]).shared).toBeNull();
  });
});
