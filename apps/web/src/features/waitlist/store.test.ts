import { storeFromEnv } from './store';

it('Review Focus 1: no DB binding → throws a named error', () => {
  expect(() => storeFromEnv({})).toThrow('waitlist: missing DB binding');
});
