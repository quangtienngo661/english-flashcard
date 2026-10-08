import { clozeReducer, createClozeState } from './cloze-state';

const start = () => createClozeState(['deploy', 'assume', 'borrow']);

describe('clozeReducer', () => {
  it('LP20 wrong pick sets wrong with picked word, then the right pick sets correct', () => {
    let s = clozeReducer(start(), { type: 'pick', word: 'delay' });
    expect(s.results[0]).toEqual({ status: 'wrong', picked: 'delay' });
    s = clozeReducer(s, { type: 'pick', word: 'deploy' });
    expect(s.results[0]).toEqual({ status: 'correct', picked: 'deploy' });
  });

  it('picking after correct does nothing', () => {
    const correct = clozeReducer(start(), { type: 'pick', word: 'deploy' });
    expect(clozeReducer(correct, { type: 'pick', word: 'delay' })).toBe(correct);
  });

  it('LP21 next from the last item sets done; restart resets everything to item 0 unanswered', () => {
    let s = start();
    s = clozeReducer(s, { type: 'next' });
    s = clozeReducer(s, { type: 'next' });
    expect(s.index).toBe(2);
    expect(s.done).toBe(false);
    s = clozeReducer(s, { type: 'pick', word: 'borrow' });
    s = clozeReducer(s, { type: 'next' });
    expect(s.done).toBe(true);
    s = clozeReducer(s, { type: 'restart' });
    expect(s).toEqual(start());
  });

  it('prev at 0 stays at 0; goTo clamps into range', () => {
    expect(clozeReducer(start(), { type: 'prev' }).index).toBe(0);
    expect(clozeReducer(start(), { type: 'goTo', index: 2 }).index).toBe(2);
    expect(clozeReducer(start(), { type: 'goTo', index: 9 }).index).toBe(2);
  });
});
