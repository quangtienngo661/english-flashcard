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
});
