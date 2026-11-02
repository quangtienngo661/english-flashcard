import { checkTyped } from './check';

describe('checkTyped', () => {
  it('LR1 ignores surrounding spaces and letter case', () => {
    expect(checkTyped('deployed', '  Deployed ')).toBe(true);
  });

  it('LR1 a different word is wrong, even when it is a prefix', () => {
    expect(checkTyped('deployed', 'deploy')).toBe(false);
  });

  it('LRE5 an empty answer is never right', () => {
    expect(checkTyped('assume', '')).toBe(false);
    expect(checkTyped('assume', '   ')).toBe(false);
  });
});
