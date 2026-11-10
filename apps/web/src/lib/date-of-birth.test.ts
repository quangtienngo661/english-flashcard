import { birthDateProblem, parseBirthDate } from './date-of-birth';

describe('parseBirthDate (dd/mm/yyyy → ISO)', () => {
  it('reads day/month/year with or without leading zeros', () => {
    expect(parseBirthDate('18/10/2013')).toBe('2013-10-18');
    expect(parseBirthDate('14/5/2008')).toBe('2008-05-14');
  });

  it('rejects a date that does not exist or a wrong shape', () => {
    expect(parseBirthDate('31/02/2010')).toBeNull();
    expect(parseBirthDate('2010-02-01')).toBeNull();
    expect(parseBirthDate('')).toBeNull();
  });
});

describe('birthDateProblem (same rule as the API, today 2026-10-18)', () => {
  const today = '2026-10-18';

  it('13 today is old enough', () => {
    expect(birthDateProblem('18/10/2013', today)).toBeNull();
  });

  it('one day short of 13 is too young', () => {
    expect(birthDateProblem('19/10/2013', today)).toBe('tooYoung');
  });

  it('an impossible date is invalid', () => {
    expect(birthDateProblem('31/02/2010', today)).toBe('invalid');
  });

  it('a date after today is in the future', () => {
    expect(birthDateProblem('19/10/2026', today)).toBe('future');
  });

  it('before 1900 is invalid', () => {
    expect(birthDateProblem('31/12/1899', today)).toBe('invalid');
  });

  it('GA6: born 29/2 turns 13 on 1/3 in a non-leap year', () => {
    expect(birthDateProblem('29/02/2008', '2021-02-28')).toBe('tooYoung');
    expect(birthDateProblem('29/02/2008', '2021-03-01')).toBeNull();
  });
});
