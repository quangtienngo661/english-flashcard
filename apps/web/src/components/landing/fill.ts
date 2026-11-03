/** Fills ICU-style `{name}` and `{name, number}` placeholders in a message the landing reuses from the app (the app formats them with next-intl; the landing's sample numbers are small). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)(?:, number)?\}/g, (_, key: string) => String(values[key]));
}
