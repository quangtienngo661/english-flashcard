import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { audioKey, speechTargets, type SenseIpa } from './audio-key.js';

const VOICES = { uk: 'en-GB-Wavenet-B', us: 'en-US-Wavenet-D' };
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

describe('audioKey', () => {
  it('is sha256 hex of voice|text|phonemes, with empty phonemes for none', () => {
    expect(audioKey('en-GB-Wavenet-B', 'lead', 'ˈlɛd')).toBe(sha('en-GB-Wavenet-B|lead|ˈlɛd'));
    expect(audioKey('en-GB-Wavenet-B', 'lead', null)).toBe(sha('en-GB-Wavenet-B|lead|'));
  });

  it('changes with each part', () => {
    const keys = new Set([audioKey('a', 'lead', null), audioKey('b', 'lead', null), audioKey('a', 'led', null), audioKey('a', 'lead', 'x')]);
    expect(keys.size).toBe(4);
  });
});

const sense = (over: Partial<SenseIpa> & { senseId: string; lemma: string }): SenseIpa => ({
  scope: 'catalog', ipaUk: null, ipaUs: null, ...over,
});

describe('speechTargets (round C, design §5.5, Review Focus 4)', () => {
  it('lead with two readings: a different UK key and real phonemes per sense', () => {
    const targets = speechTargets([
      sense({ senseId: 'metal', lemma: 'lead', ipaUk: 'lɛd', ipaUs: 'lɛd' }),
      sense({ senseId: 'guide', lemma: 'lead', ipaUk: 'liːd', ipaUs: 'liːd' }),
    ], VOICES);
    const metal = targets.get('metal')!;
    const guide = targets.get('guide')!;
    expect(metal.uk.key).not.toBe(guide.uk.key);
    expect(metal.uk).toMatchObject({ voiceName: 'en-GB-Wavenet-B', text: 'lead', phonemes: 'lɛd' });
    expect(guide.uk).toMatchObject({ phonemes: 'liːd' });
    expect(metal.us.key).not.toBe(guide.us.key);
    expect(metal.uk.key).toBe(audioKey('en-GB-Wavenet-B', 'lead', 'lɛd'));
  });

  it('record: every sense has the same UK ipa → one key, no phonemes (the voice reads the word as it is)', () => {
    const targets = speechTargets([
      sense({ senseId: 'noun', lemma: 'record', ipaUk: 'ˈrekɔːd', ipaUs: 'ˈrɛkɚd' }),
      sense({ senseId: 'verb', lemma: 'record', ipaUk: 'ˈrekɔːd', ipaUs: 'ˈrɛkɚd' }),
    ], VOICES);
    expect(targets.get('noun')!.uk.key).toBe(targets.get('verb')!.uk.key);
    expect(targets.get('noun')!.uk.phonemes).toBeNull();
    expect(targets.get('noun')!.uk.key).toBe(audioKey(VOICES.uk, 'record', null));
  });

  it('a sense with no ipa has no phonemes and the plain text key', () => {
    const targets = speechTargets([sense({ senseId: 'a', lemma: 'cat' })], VOICES);
    expect(targets.get('a')!.uk).toEqual({ key: audioKey(VOICES.uk, 'cat', null), voiceName: VOICES.uk, text: 'cat', phonemes: null });
    expect(targets.get('a')!.us).toEqual({ key: audioKey(VOICES.us, 'cat', null), voiceName: VOICES.us, text: 'cat', phonemes: null });
  });

  it('a lemma with two readings keeps no phonemes for a sense without ipa', () => {
    const targets = speechTargets([
      sense({ senseId: 'a', lemma: 'lead', ipaUk: 'lɛd' }), sense({ senseId: 'b', lemma: 'lead', ipaUk: 'liːd' }), sense({ senseId: 'c', lemma: 'lead' }),
    ], VOICES);
    expect(targets.get('c')!.uk.phonemes).toBeNull();
  });

  it('a private word has the key of the catalog word of the same spelling that has one reading', () => {
    const targets = speechTargets([
      sense({ senseId: 'cat1', lemma: 'phobia', ipaUk: 'ˈfəʊbiə', ipaUs: 'ˈfoʊbiə' }),
      sense({ senseId: 'mine', lemma: 'phobia', scope: 'private' }),
    ], VOICES);
    expect(targets.get('mine')!.uk.key).toBe(targets.get('cat1')!.uk.key);
    expect(targets.get('mine')!.us.key).toBe(targets.get('cat1')!.us.key);
  });

  it('a private word never gets phonemes, even beside a catalog word with two readings', () => {
    const targets = speechTargets([
      sense({ senseId: 'a', lemma: 'lead', ipaUk: 'lɛd' }), sense({ senseId: 'b', lemma: 'lead', ipaUk: 'liːd' }),
      sense({ senseId: 'mine', lemma: 'lead', scope: 'private' }),
    ], VOICES);
    expect(targets.get('mine')!.uk.phonemes).toBeNull();
  });

  it('a phrase with ipa and several readings gets no phonemes: one phoneme tag covers one word', () => {
    const targets = speechTargets([
      sense({ senseId: 'a', lemma: 'look after', ipaUk: 'lʊk ˈɑːftə' }), sense({ senseId: 'b', lemma: 'look after', ipaUk: 'lʊk ˈæftə' }),
    ], VOICES);
    expect(targets.get('a')!.uk.phonemes).toBeNull();
    expect(targets.get('b')!.uk.phonemes).toBeNull();
    expect(targets.get('a')!.uk.key).toBe(targets.get('b')!.uk.key);
  });

  it('an ipa that cannot be turned into Google symbols falls back to the text key, never to an error', () => {
    const targets = speechTargets([
      sense({ senseId: 'a', lemma: 'odd', ipaUk: 'ʘdd' }), sense({ senseId: 'b', lemma: 'odd', ipaUk: 'ɒd' }),
    ], VOICES);
    expect(targets.get('a')!.uk.phonemes).toBeNull();
    expect(targets.get('b')!.uk.phonemes).toBeNull(); // only one usable reading → plain text
    expect(targets.get('a')!.uk.key).toBe(audioKey(VOICES.uk, 'odd', null));
  });

  it('UK and US readings are counted apart: a US-only split does not give the UK phonemes', () => {
    const targets = speechTargets([
      sense({ senseId: 'a', lemma: 'tomato', ipaUk: 'təˈmɑːtəʊ', ipaUs: 'təˈmeɪtoʊ' }),
      sense({ senseId: 'b', lemma: 'tomato', ipaUk: 'təˈmɑːtəʊ', ipaUs: 'təˈmɑːtoʊ' }),
    ], VOICES);
    expect(targets.get('a')!.uk.phonemes).toBeNull();
    expect(targets.get('a')!.us.phonemes).toBe('təˈmeɪtoʊ');
    expect(targets.get('b')!.us.phonemes).toBe('təˈmɑːtoʊ');
  });

  it('returns one entry per sense given, in any order', () => {
    const targets = speechTargets([sense({ senseId: 'x', lemma: 'a' }), sense({ senseId: 'y', lemma: 'b' })], VOICES);
    expect([...targets.keys()].sort()).toEqual(['x', 'y']);
  });
});
