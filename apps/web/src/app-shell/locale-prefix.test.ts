import { prefixFix, safeNext } from './locale-prefix';

describe('safeNext (E1, Review Focus 5)', () => {
  it('rejects anything outside the app', () => {
    expect(safeNext('https://evil.example', 'vi')).toBe('/vi/app');
    expect(safeNext('//evil.example/vi/app', 'vi')).toBe('/vi/app');
    expect(safeNext('/vi/terms', 'vi')).toBe('/vi/app');
    expect(safeNext(null, 'en')).toBe('/en/app');
  });

  it('keeps an app path with its query', () => {
    expect(safeNext('/vi/app/group?id=x', 'vi')).toBe('/vi/app/group?id=x');
  });

  it('moves an app path of the other locale to this one', () => {
    expect(safeNext('/en/app', 'vi')).toBe('/vi/app');
    expect(safeNext('/en/app/settings', 'vi')).toBe('/vi/app/settings');
  });

  it('does not take /vi/apple for the app', () => {
    expect(safeNext('/vi/apple', 'vi')).toBe('/vi/app');
  });
});

describe('prefixFix (E10)', () => {
  it('moves to the profile language, keeping the sub-path and query', () => {
    expect(prefixFix('/en/app/word?w=go', 'vi')).toBe('/vi/app/word?w=go');
  });

  it('does nothing when the prefix already matches or the profile has no language', () => {
    expect(prefixFix('/vi/app', 'vi')).toBeNull();
    expect(prefixFix('/vi/app', null)).toBeNull();
  });
});
