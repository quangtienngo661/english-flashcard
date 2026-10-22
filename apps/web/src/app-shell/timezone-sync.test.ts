import { timezoneToSync } from './timezone-sync';

describe('timezoneToSync (E11)', () => {
  it('nothing to send when the device and the profile agree', () => {
    expect(timezoneToSync('Asia/Ho_Chi_Minh', 'Asia/Ho_Chi_Minh')).toBeNull();
  });

  it('sends the device zone when it differs', () => {
    expect(timezoneToSync('Europe/Berlin', 'Asia/Ho_Chi_Minh')).toBe('Europe/Berlin');
  });

  it('never sends an empty zone', () => {
    expect(timezoneToSync('', 'Asia/Ho_Chi_Minh')).toBeNull();
  });
});
