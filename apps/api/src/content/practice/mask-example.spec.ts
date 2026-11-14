import { describe, expect, it } from 'vitest';
import { maskExample } from './mask-example.js';

const deploy = { lemma: 'deploy', variants: [], inflections: [{ form: 'deploys' }, { form: 'deployed' }, { form: 'deploying' }] };

describe('maskExample', () => {
  it('masks deployed in "We deployed the app." → "We ___ the app.", blank deployed, base false', () => {
    expect(maskExample('We deployed the app.', deploy)).toEqual({ masked: 'We ___ the app.', blank: 'deployed', base: false });
  });

  it('masks the sentence-initial "Deploy it." → "___ it.", blank deploy, base true', () => {
    expect(maskExample('Deploy it.', deploy)).toEqual({ masked: '___ it.', blank: 'deploy', base: true });
  });

  it('masks every match of the same word, including a capital after . ! or ?', () => {
    expect(maskExample('We deploy daily. Deploy now! deploy?', deploy))
      .toEqual({ masked: 'We ___ daily. ___ now! ___?', blank: 'deploy', base: true });
  });

  it('B4E35: "Deploy it, we deployed it." → null', () => {
    expect(maskExample('Deploy it, we deployed it.', deploy)).toBeNull();
  });

  it('B4E37: target march leaves "March" untouched and returns null when only "March" is present', () => {
    const march = { lemma: 'march', variants: [], inflections: [{ form: 'marched' }] };
    expect(maskExample('We met in March.', march)).toBeNull();
    expect(maskExample('In March they march.', march)).toEqual({ masked: 'In March they ___.', blank: 'march', base: true });
  });

  it('a capital that does not start the sentence is not a match', () => {
    expect(maskExample('We Deploy it.', deploy)).toBeNull();
  });

  it('matches a variant "analysed" with base true', () => {
    const analyze = { lemma: 'analyze', variants: ['analyse', 'analysed'], inflections: [{ form: 'analyzed' }] };
    expect(maskExample('They analysed the data.', analyze)).toEqual({ masked: 'They ___ the data.', blank: 'analysed', base: true });
  });

  it('multi-word "look after" in "She looks after it" with inflection "looks after"', () => {
    const lookAfter = { lemma: 'look after', variants: [], inflections: [{ form: 'looks after' }, { form: 'looked after' }] };
    expect(maskExample('She looks after it', lookAfter)).toEqual({ masked: 'She ___ it', blank: 'looks after', base: false });
    expect(maskExample('She looks at it after lunch', lookAfter)).toBeNull();
  });

  it('a curly apostrophe counts as a straight one', () => {
    const cant = { lemma: "can't", variants: [], inflections: [] };
    expect(maskExample('I can’t go.', cant)).toEqual({ masked: 'I ___ go.', blank: "can't", base: true });
  });

  it('a hyphen splits tokens', () => {
    expect(maskExample('A well-deployed app.', deploy)).toEqual({ masked: 'A well-___ app.', blank: 'deployed', base: false });
  });

  it('no match → null', () => {
    expect(maskExample('Nothing here.', deploy)).toBeNull();
  });

  it('deploys inside "redeploys" is not a match', () => {
    expect(maskExample('She redeploys it.', deploy)).toBeNull();
  });

  it.each([
    ["CT5: possessive 's is not masked, only the stem", "The student's book.", { lemma: 'student', variants: [], inflections: [] },
      { masked: "The ___'s book.", blank: 'student', base: true }],
    ['CT5: a bare apostrophe possessive masks the stem', "The students' book.", { lemma: 'student', variants: [], inflections: [{ form: 'students' }] },
      { masked: "The ___' book.", blank: 'students', base: false }],
    ['CT5: a comma between the words of a multi-word form is not a match', 'I like ice, cream.', { lemma: 'ice cream', variants: [], inflections: [] }, null],
    ['CT5: a multi-word form still matches across plain spaces', 'I like ice  cream.', { lemma: 'ice cream', variants: [], inflections: [] },
      { masked: 'I like ___.', blank: 'ice cream', base: true }],
    ['CT5: "Mr." does not end a sentence, so a capital March is not lower-case march', 'Mr. March is here.', { lemma: 'march', variants: [], inflections: [] }, null],
    ['CT5: "Mr." does not end a sentence, target March still matches', 'Mr. March is here.', { lemma: 'March', variants: [], inflections: [] },
      { masked: 'Mr. ___ is here.', blank: 'March', base: true }],
    ['CT6: a form ending in a dot takes the sentence dot with it', 'We meet at 9 a.m.', { lemma: 'a.m.', variants: [], inflections: [] },
      { masked: 'We meet at 9 ___', blank: 'a.m.', base: true }],
    ['CT6: a dotted form is masked in the middle of a sentence', 'At 9 a.m. we meet.', { lemma: 'a.m.', variants: [], inflections: [] },
      { masked: 'At 9 ___ we meet.', blank: 'a.m.', base: true }],
    ['CT6: MP3 player does not match MP4 player (FE24)', 'An MP4 player.', { lemma: 'MP3 player', variants: [], inflections: [] }, null],
    ['CT6: MP3 player matches itself', 'An MP3 player.', { lemma: 'MP3 player', variants: [], inflections: [] },
      { masked: 'An ___.', blank: 'MP3 player', base: true }],
    ['CT6: variant "am" of "a.m." does not mask the verb "am"', 'I am here.', { lemma: 'a.m.', variants: ['am'], inflections: [] }, null],
  ])('%s', (_name, sentence, target, expected) => {
    expect(maskExample(sentence, target)).toEqual(expected);
  });
});
