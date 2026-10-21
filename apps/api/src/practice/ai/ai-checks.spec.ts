import { describe, expect, it } from 'vitest';
import { seededRandom } from '../testing/seeded-random.js';
import { candidate, deploy } from '../testing/ai-senses.js';
import { checkCloze, checkMcq, checkMeaning, mcqForms, pickMcqForm, pickWrongMeanings, revealsWord, validForms } from './ai-checks.js';

const verb = (lemma: string, past: string, participle = past) => candidate({
  lemma, inflections: [{ form: `${lemma}s`, kind: 'third_person' }, { form: past, kind: 'past' }, { form: participle, kind: 'past_participle' }],
});

describe('validForms', () => {
  it('lemma, spellings, accepted forms, inflections and staff-added forms, normalized', () => {
    expect(validForms(deploy({ variants: ['Deploy'], accepted: ['de-ploy'], extra_forms: ['redeploy'] })))
      .toEqual(new Set(['deploy', 'de-ploy', 'deploys', 'deploying', 'deployed', 'redeploy']));
  });
});

describe('checkCloze (design §7.2)', () => {
  const sentence = 'We ___ the app every Friday.';

  it('valid forms pass and come back normalized', () => {
    expect(checkCloze({ sentence, accepted_answers: ['deploy', 'Deploy.'] }, deploy())).toEqual({ ok: true, accepted: ['deploy'] });
  });

  it('B7E34: deployment for deploy → rejected, the form reported as unknown', () => {
    expect(checkCloze({ sentence, accepted_answers: ['deploy', 'deployment'] }, deploy()))
      .toEqual({ ok: false, unknownForms: ['deployment'], reveals: false });
  });

  it('an answer staff added for the lemma (extra_forms) passes', () => {
    expect(checkCloze({ sentence, accepted_answers: ['deployment'] }, deploy({ extra_forms: ['deployment'] })))
      .toEqual({ ok: true, accepted: ['deployment'] });
  });

  it('B7E120: "Deploy is easy: we ___ the app daily." → rejected, reveals', () => {
    expect(checkCloze({ sentence: 'Deploy is easy: we ___ the app daily.', accepted_answers: ['deploy'] }, deploy()))
      .toEqual({ ok: false, unknownForms: [], reveals: true });
  });
});

describe('revealsWord', () => {
  it('finds any form outside the blank, even two different ones; a longer word holding it does not count', () => {
    expect(revealsWord('They deployed it, now we ___ it and it deploys.', deploy())).toBe(true);
    expect(revealsWord('The deployment went well; we ___ again.', deploy())).toBe(false);
    expect(revealsWord('We ___ on Fridays.', deploy())).toBe(false);
  });
});

describe('checkMeaning (design §7.4)', () => {
  it('the form used appears once and is a form of the word → ok', () => {
    expect(checkMeaning({ sentence: 'We deployed the app.', word_in_sentence: 'deployed' }, deploy())).toEqual({ ok: true });
    // A capital at the start of the sentence still matches.
    expect(checkMeaning({ sentence: 'Deploy it now.', word_in_sentence: 'deploy' }, deploy())).toEqual({ ok: true });
  });

  it('B7E36: word_in_sentence absent or there twice → rejected', () => {
    expect(checkMeaning({ sentence: 'We shipped the app.', word_in_sentence: 'deployed' }, deploy()))
      .toEqual({ ok: false, unknownForms: [] });
    expect(checkMeaning({ sentence: 'We deployed it and deployed it again.', word_in_sentence: 'deployed' }, deploy()))
      .toEqual({ ok: false, unknownForms: [] });
  });

  it('a form the word does not have → rejected and reported as unknown', () => {
    expect(checkMeaning({ sentence: 'The deployment worked.', word_in_sentence: 'deployment' }, deploy()))
      .toEqual({ ok: false, unknownForms: ['deployment'] });
  });
});

describe('checkMcq (design §7.5)', () => {
  const candidates = ['released', 'posted', 'shipped', 'built'];
  const sentence = 'Yesterday we ___ the app.';

  it('three distinct distractors from the candidates sent → ok (compared after normalization)', () => {
    expect(checkMcq({ sentence, distractors: ['Released', 'posted', 'built'] }, 'deployed', candidates, deploy())).toEqual({ ok: true });
  });

  it('B7E35: a distractor outside the candidates sent → rejected', () => {
    expect(checkMcq({ sentence, distractors: ['released', 'posted', 'pushed'] }, 'deployed', candidates, deploy())).toEqual({ ok: false });
  });

  it('a distractor equal to the answer form, or the word shown outside the blank (B7E120) → rejected', () => {
    expect(checkMcq({ sentence, distractors: ['released', 'posted', 'deployed'] }, 'deployed', [...candidates, 'deployed'], deploy()))
      .toEqual({ ok: false });
    expect(checkMcq({ sentence: 'We deploy daily; yesterday we ___ it.', distractors: ['released', 'posted', 'built'] }, 'deployed',
      candidates, deploy())).toEqual({ ok: false });
  });
});

describe('mcqForms / pickMcqForm (design §7.5, D18)', () => {
  it('a candidate counts for deployed (past and past participle) only when both of its forms are the same spelling', () => {
    const forms = mcqForms(deploy(), [verb('release', 'released'), verb('write', 'wrote', 'written'), verb('ship', 'shipped')]);
    expect(forms.find((f) => f.answerForm === 'deployed')?.candidates).toEqual(['released', 'shipped']);
    expect(forms.find((f) => f.answerForm === 'deploy')?.candidates).toEqual(['release', 'write', 'ship']);
    expect(forms.find((f) => f.answerForm === 'deploys')?.candidates).toEqual(['releases', 'writes', 'ships']);
  });

  it('only forms with at least 3 candidates are picked; at most 6 candidates are sent; none when no form has 3', () => {
    const many = ['release', 'ship', 'post', 'build', 'push', 'launch', 'start', 'stop'].map((lemma) => candidate({ lemma }));
    for (let seed = 1; seed <= 20; seed++) {
      const pick = pickMcqForm(deploy(), many, seededRandom(seed))!;
      // Candidates without inflections only have the base form.
      expect(pick.answerForm).toBe('deploy');
      expect(pick.candidates).toHaveLength(6);
      expect(pick.senses.map((x) => x.lemma)).toEqual(pick.candidates);
    }
    expect(pickMcqForm(deploy(), many.slice(0, 2), seededRandom(1))).toBeNull();
  });
});

describe('pickWrongMeanings (design §7.4, D17)', () => {
  const none = new Map();

  it('takes other senses of the entry first, then group mates, then random senses', () => {
    const s = deploy();
    const other = candidate({ lemma: 'deploy', entry_id: s.entry_id, gloss_vi: 'dàn quân' });
    const mate = candidate({ lemma: 'release', gloss_vi: 'phát hành' });
    const randoms = [candidate({ lemma: 'table', gloss_vi: 'cái bàn' }), candidate({ lemma: 'chair', gloss_vi: 'cái ghế' })];
    expect(pickWrongMeanings(s, [other], [mate], randoms, none)?.map((c) => c.gloss_vi)).toEqual(['dàn quân', 'phát hành', 'cái bàn']);
  });

  it('a meaning sharing a sub-meaning with the right one or with one picked is skipped; no Vietnamese meaning is skipped', () => {
    const s = deploy({ gloss_vi: 'triển khai, bố trí' });
    const list = [
      candidate({ gloss_vi: 'bố trí' }), candidate({ gloss_vi: null }), candidate({ gloss_vi: 'phát hành' }),
      candidate({ gloss_vi: 'phát hành; in' }), candidate({ gloss_vi: 'cái bàn' }), candidate({ gloss_vi: 'cái ghế' }),
    ];
    expect(pickWrongMeanings(s, [], [], list, none)?.map((c) => c.gloss_vi)).toEqual(['phát hành', 'cái bàn', 'cái ghế']);
  });

  it('a meaning shown in another language than the right one is skipped (en learner); fewer than 3 → null', () => {
    const s = deploy({ meaning: { text: 'to move software', language: 'en', translation_missing: false } });
    const vi = candidate({ gloss_vi: 'phát hành' });
    const en = (gloss: string) => candidate({ gloss_vi: gloss, meaning: { text: gloss, language: 'en', translation_missing: false } });
    expect(pickWrongMeanings(s, [], [], [vi, en('a'), en('b')], none)).toBeNull();
    expect(pickWrongMeanings(s, [], [], [vi, en('a'), en('b'), en('c')], none)?.map((c) => c.gloss_vi)).toEqual(['a', 'b', 'c']);
  });

  it('group mates go through the Bước 4 filter: the same lemma is dropped there', () => {
    const s = deploy();
    const sameLemma = candidate({ lemma: 'Deploy', gloss_vi: 'dàn quân' });
    const randoms = [candidate({ gloss_vi: 'a' }), candidate({ gloss_vi: 'b' }), candidate({ gloss_vi: 'c' })];
    expect(pickWrongMeanings(s, [], [sameLemma], randoms, none)?.map((c) => c.gloss_vi)).toEqual(['a', 'b', 'c']);
  });
});
