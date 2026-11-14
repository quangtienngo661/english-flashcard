import { describe, expect, it } from 'vitest';
import { canonicalTimeZone, normalizeStoredTimeZone } from './timezone.js';

describe('time zone names', () => {
  it('C2: canonicalTimeZone returns the one canonical spelling of a zone name and null for an invalid name or an offset', () => {
    expect(canonicalTimeZone('asia/ho_chi_minh')).toBe('Asia/Saigon');
    expect(canonicalTimeZone('ASIA/HO_CHI_MINH')).toBe('Asia/Saigon');
    expect(canonicalTimeZone('Asia/Saigon')).toBe('Asia/Saigon');
    expect(canonicalTimeZone('utc')).toBe('UTC');
    expect(canonicalTimeZone('UTC')).toBe('UTC');
    expect(canonicalTimeZone('etc/gmt-7')).toBe('Etc/GMT-7');
    expect(canonicalTimeZone('+07:00')).toBeNull();
    expect(canonicalTimeZone('-23:59')).toBeNull();
    expect(canonicalTimeZone('+0700')).toBeNull();
    expect(canonicalTimeZone('Mars/Base')).toBeNull();
    expect(canonicalTimeZone('')).toBeNull();
    expect(canonicalTimeZone('UTC\u0000')).toBeNull();
  });

  it('C2: normalizeStoredTimeZone keeps a canonical name, maps a whole-hour offset to Etc/GMT with the POSIX sign flip, else UTC', () => {
    expect(normalizeStoredTimeZone('+07:00')).toBe('Etc/GMT-7');
    expect(normalizeStoredTimeZone('-05:00')).toBe('Etc/GMT+5');
    expect(normalizeStoredTimeZone('+0700')).toBe('Etc/GMT-7');
    expect(normalizeStoredTimeZone('+14:00')).toBe('Etc/GMT-14');
    expect(normalizeStoredTimeZone('-12:00')).toBe('Etc/GMT+12');
    expect(normalizeStoredTimeZone('+00:00')).toBe('UTC');
    expect(normalizeStoredTimeZone('+05:30')).toBe('UTC');
    expect(normalizeStoredTimeZone('-13:00')).toBe('UTC');
    expect(normalizeStoredTimeZone('Mars/Base')).toBe('UTC');
    expect(normalizeStoredTimeZone('asia/saigon')).toBe('Asia/Saigon');
    expect(normalizeStoredTimeZone('Asia/Ho_Chi_Minh')).toBe('Asia/Saigon');
    expect(normalizeStoredTimeZone('UTC')).toBe('UTC');
  });
});
