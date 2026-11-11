import { historyTarget } from './history-target';

describe('historyTarget (design §10.4)', () => {
  it('?tab=reports goes to Báo lỗi của tôi in Settings', () => {
    expect(historyTarget('vi', new URLSearchParams('tab=reports'))).toBe('/vi/app/settings/reports');
    expect(historyTarget('en', new URLSearchParams('tab=reports&date=2026-11-05'))).toBe('/en/app/settings/reports');
  });

  it('a valid ?date= opens that day', () => {
    expect(historyTarget('en', new URLSearchParams('date=2026-11-05'))).toBe('/en/app/practice?ngay=2026-11-05');
  });

  it('anything else opens the calendar on the current month', () => {
    for (const query of ['', 'date=2026-02-30', 'date=2025-12-31', 'date=yesterday', 'tab=answers']) {
      expect(historyTarget('vi', new URLSearchParams(query)), query).toBe('/vi/app/practice?lich');
    }
  });
});
