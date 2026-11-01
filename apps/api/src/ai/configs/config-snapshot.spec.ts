import { describe, expect, it } from 'vitest';
import { configFingerprint, contentOfConfig, configContentSchema } from './config-snapshot.js';

const content = { instructions: 'Write a sentence.', examples: [{ input: { word: 'go', level: 'A1' }, output: { sentence: 'I ___ home.' } }], model_ref: '00000000-0000-4000-8000-000000000001', effort: null, thinking: null, max_output_tokens: 1000 };
describe('config snapshots', () => {
  it('canonicalizes object keys, not strings or array order', () => {
    const a = configFingerprint('generate_cloze', content);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(configFingerprint('generate_cloze', { ...content, examples: [{ output: { sentence: 'I ___ home.' }, input: { level: 'A1', word: 'go' } }] })).toBe(a);
    expect(configFingerprint('generate_cloze', { ...content, instructions: 'Write a sentence. ' })).not.toBe(a);
    expect(configFingerprint('lookup_word', content)).not.toBe(a);
    for (const change of [{ model_ref: null }, { effort: 'low' }, { thinking: 'off' as const }, { max_output_tokens: 2000 }, { examples: [] }]) {
      expect(configFingerprint('generate_cloze', { ...content, ...change })).not.toBe(a);
    }
    const two = { ...content, examples: [...content.examples, { input: { word: 'run', level: 'B1' }, output: { sentence: 'We ___ fast.' } }] };
    expect(configFingerprint('generate_cloze', two)).not.toBe(configFingerprint('generate_cloze', { ...two, examples: [...two.examples].reverse() }));
  });
  it('does not include mutable metadata in a row fingerprint', () => {
    const row = { instructions: content.instructions, examples: content.examples, modelRef: content.model_ref, effort: null, thinking: null, maxOutputTokens: 1000, name: 'First', note: 'note', version: 3 };
    expect(contentOfConfig(row)).toEqual(content);
    expect(configFingerprint('generate_cloze', contentOfConfig({ ...row, name: 'Second', version: 4 }))).toBe(configFingerprint('generate_cloze', content));
  });
  it('validates snapshot shape with no metadata or unrecognized properties', () => {
    expect(configContentSchema.safeParse(content).success).toBe(true);
    expect(configContentSchema.safeParse({ ...content, note: 'not execution content' }).success).toBe(false);
    expect(configContentSchema.safeParse({ ...content, model_ref: 'wrong' }).success).toBe(false);
  });
});
