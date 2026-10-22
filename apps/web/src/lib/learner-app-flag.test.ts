import { appPageExtensions, learnerAppRedirect } from './learner-app-flag';

describe('learnerAppRedirect (D8, E20)', () => {
  it('E20: sends /{locale}/app to the landing when the app is off', () => {
    expect(learnerAppRedirect('/vi/app', false)).toBe('/vi');
  });

  it('E20: sends any app sub-path to the landing of its locale', () => {
    expect(learnerAppRedirect('/en/app/group', false)).toBe('/en');
  });

  it('leaves the app alone when it is on', () => {
    expect(learnerAppRedirect('/vi/app', true)).toBeNull();
  });

  it('does not touch paths that only start with "app"', () => {
    expect(learnerAppRedirect('/vi/apple', false)).toBeNull();
  });

  it('does not touch the landing', () => {
    expect(learnerAppRedirect('/vi', false)).toBeNull();
  });
});

describe('appPageExtensions (D21)', () => {
  it('puts app.tsx first when the app is on', () => {
    expect(appPageExtensions(true)[0]).toBe('app.tsx');
  });

  it('leaves app.tsx out when the app is off', () => {
    expect(appPageExtensions(false)).not.toContain('app.tsx');
  });
});
