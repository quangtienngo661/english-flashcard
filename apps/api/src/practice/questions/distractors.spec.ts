import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { seededRandom } from '../testing/seeded-random.js';
import { eligibleCandidates, pickDistractors, subsenses, type LemmaMeanings, type QuestionWord } from './distractors.js';

function word(lemma: string, data: Partial<QuestionWord> = {}): QuestionWord {
  return {
    sense_id: randomUUID(), entry_id: randomUUID(), scope: 'catalog', lemma, gloss_vi: null, definition_en: null,
    form_of_entry_id: null, function_word: false, ...data,
  };
}

describe('subsenses', () => {
  it('splits on , and ;, drops ( … ) parts, lower-cases, trims and drops empties', () => {
    expect(subsenses('Triển khai (phần mềm)')).toEqual(['triển khai']);
    expect(subsenses('triển khai, thực hiện; ,  (ghi chú) ')).toEqual(['triển khai', 'thực hiện']);
    expect(subsenses('café')).toEqual(['café']);
  });
});

describe('eligibleCandidates', () => {
  const deploy = word('deploy', { gloss_vi: 'triển khai (phần mềm)', definition_en: 'to put software into use' });

  it('B4#3 (filters): implement "triển khai, thực hiện" is dropped for deploy "triển khai (phần mềm)"; deployed (form of deploy) is dropped; a second sense of deploy is dropped; Deploy and deploy count as one lemma', () => {
    const implement = word('implement', { gloss_vi: 'triển khai, thực hiện' });
    const deployed = word('deployed', { gloss_vi: 'đã được triển khai', form_of_entry_id: deploy.entry_id });
    const deploySecond = word('deploy', { entry_id: deploy.entry_id, gloss_vi: 'bố trí (quân)' });
    const deployCapital = word('Deploy', { gloss_vi: 'dàn quân' });
    const delay = word('delay', { gloss_vi: 'trì hoãn' });
    const delayAgain = word('Delay', { gloss_vi: 'sự chậm trễ' });
    const deliver = word('deliver', { gloss_vi: 'giao hàng' });

    const result = eligibleCandidates(deploy, [deploy, implement, deployed, deploySecond, deployCapital, delay, delayAgain, deliver]);
    expect(result.map((w) => w.lemma)).toEqual(['delay', 'deliver']);
  });

  it('limit stops the walk once that many eligible candidates are found', () => {
    const pool = ['a', 'b', 'c', 'd'].map((l) => word(l));
    expect(eligibleCandidates(deploy, pool, 3).map((w) => w.lemma)).toEqual(['a', 'b', 'c']);
  });

  it('a base word is dropped when the asked word is its form', () => {
    const deployed = word('deployed', { gloss_vi: 'đã triển khai', form_of_entry_id: deploy.entry_id });
    expect(eligibleCandidates(deployed, [deploy])).toEqual([]);
  });

  it('R13: a private word with only an English meaning is compared on definition_en', () => {
    const asked = word('ship', { scope: 'private', definition_en: 'to send out, release' });
    const release = word('launch', { gloss_vi: 'phóng', definition_en: 'Release; start' });
    const other = word('fix', { gloss_vi: 'sửa', definition_en: 'repair' });
    // Neither side has an English meaning to compare: kept.
    const bare = word('patch', { scope: 'private' });
    expect(eligibleCandidates(asked, [release, other, bare]).map((w) => w.lemma)).toEqual(['fix', 'patch']);
  });
});

describe('eligibleCandidates — one right answer (T6/FE25)', () => {
  it('T6/FE25: "quick" is dropped when any visible sense of "quick" means "nhanh", even outside the group', () => {
    const asked = word('fast', { gloss_vi: 'nhanh' });
    const quick = word('quick', { gloss_vi: 'nhanh trí' });
    const meanings: LemmaMeanings = new Map([['quick', [
      { gloss_vi: 'nhanh trí', definition_en: null }, { gloss_vi: 'nhanh', definition_en: null },
    ]]]);
    expect(eligibleCandidates(asked, [quick], Infinity, meanings)).toEqual([]);
  });

  it('T6 true/false: "arrange — sắp xếp, bố trí" is dropped when "deploy" has a sense "bố trí (quân)"', () => {
    const deploy = word('deploy', { gloss_vi: 'triển khai (phần mềm)' });
    const arrange = word('arrange', { gloss_vi: 'sắp xếp, bố trí' });
    const meanings: LemmaMeanings = new Map([['deploy', [
      { gloss_vi: 'triển khai (phần mềm)', definition_en: null }, { gloss_vi: 'bố trí (quân)', definition_en: null },
    ]]]);
    expect(eligibleCandidates(deploy, [arrange], Infinity, meanings)).toEqual([]);
  });

  it('control: an unrelated candidate stays', () => {
    const asked = word('fast', { gloss_vi: 'nhanh' });
    const slow = word('slow', { gloss_vi: 'chậm' });
    const meanings: LemmaMeanings = new Map([
      ['fast', [{ gloss_vi: 'nhanh', definition_en: null }]], ['slow', [{ gloss_vi: 'chậm', definition_en: null }]],
    ]);
    expect(eligibleCandidates(asked, [slow], Infinity, meanings).map((w) => w.lemma)).toEqual(['slow']);
  });
});

describe('pickDistractors', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map((l) => word(l));

  it('returns null when fewer than count exist', () => {
    expect(pickDistractors(pool.slice(0, 2), 3, [], seededRandom(1))).toBeNull();
  });

  it('returns count distinct candidates', () => {
    const picked = pickDistractors(pool, 3, [], seededRandom(2))!;
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((w) => w.sense_id)).size).toBe(3);
  });

  it('pickDistractors avoids the previous round\'s ids when enough exist', () => {
    const avoid = pool.slice(0, 3).map((w) => w.sense_id);
    for (let seed = 1; seed <= 50; seed++) {
      const picked = pickDistractors(pool, 3, avoid, seededRandom(seed))!;
      expect(picked.map((w) => w.lemma).sort()).toEqual(['d', 'e', 'f']);
    }
    // Not enough fresh ones: the avoided ids fill the gap.
    const filled = pickDistractors(pool.slice(0, 4), 3, avoid, seededRandom(3))!;
    expect(filled.map((w) => w.lemma)).toContain('d');
    expect(filled).toHaveLength(3);
  });
});
