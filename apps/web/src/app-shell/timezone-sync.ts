/** E11: the device's IANA zone to store on the profile, or null when there is nothing to change. */
export function timezoneToSync(deviceTz: string, profileTz: string): string | null {
  return deviceTz && deviceTz !== profileTz ? deviceTz : null;
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}
