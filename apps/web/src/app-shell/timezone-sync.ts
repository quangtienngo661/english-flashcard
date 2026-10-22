/** The name this browser uses for a zone (the API stores Node's canonical name, e.g. Asia/Saigon for Asia/Ho_Chi_Minh). */
function canonical(zone: string): string {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return zone;
  }
}

/** E11: the device's IANA zone to store on the profile, or null when there is nothing to change (same zone under any name). */
export function timezoneToSync(deviceTz: string, profileTz: string): string | null {
  return deviceTz && canonical(deviceTz) !== canonical(profileTz) ? deviceTz : null;
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}
