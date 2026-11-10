import { chromeShape } from './skeleton-shape';

// Design giao diện mới §5.5: the hard-load skeleton takes the shape of the page being opened.
describe('chromeShape', () => {
  it.each([
    ['/vi/app', 'chrome'],
    ['/vi/app/groups', 'chrome'],
    ['/vi/app/practice', 'chrome'],
    ['/vi/app/settings/account', 'chrome'],
    ['/en/app/practice/session', 'bare'],
    ['/vi/app/review', 'bare'],
    ['/vi/app/recall', 'bare'],
    ['/vi/app/welcome', 'bare'],
    ['/vi/app/complete-profile', 'bare'],
    ['/vi/app/login', 'bare'],
    ['/en/app/reset-password', 'bare'],
  ] as const)('%s → %s', (path, shape) => {
    expect(chromeShape(path)).toBe(shape);
  });
});
