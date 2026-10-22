import { timezoneToSync } from './timezone-sync';

describe('timezoneToSync (E11)', () => {
  it('nothing to send when the device and the profile agree', () => {
    expect(timezoneToSync('Asia/Ho_Chi_Minh', 'Asia/Ho_Chi_Minh')).toBeNull();
  });

  it('sends the device zone when it differs', () => {
    expect(timezoneToSync('Europe/Berlin', 'Asia/Ho_Chi_Minh')).toBe('Europe/Berlin');
  });

  it('two names of the same zone are the same zone (API stores Asia/Saigon, a browser may say Asia/Ho_Chi_Minh)', () => {
    expect(timezoneToSync('Asia/Ho_Chi_Minh', 'Asia/Saigon')).toBeNull();
  });

  it('never sends an empty zone', () => {
    expect(timezoneToSync('', 'Asia/Ho_Chi_Minh')).toBeNull();
  });
});
