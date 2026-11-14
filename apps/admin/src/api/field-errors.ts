import { useEffect } from 'react';

/**
 * Splits `violations` (`"<path>: <message>"`) into per-field messages and the rest.
 * `fieldOf` maps a path to a field id (or `null`); a violation with no `": "`, or whose path maps to no field, goes to `form`
 * unchanged (the whole string, so the path is not lost). Several violations on one field are joined with a space.
 */
export function violationsToFields(
  violations: string[],
  fieldOf: (path: string) => string | null,
): { fields: Record<string, string>; form: string[] } {
  const fields: Record<string, string> = {};
  const form: string[] = [];
  for (const violation of violations) {
    const at = violation.indexOf(': ');
    const id = at === -1 ? null : fieldOf(violation.slice(0, at));
    if (id === null) {
      form.push(violation);
      continue;
    }
    const message = violation.slice(at + 2);
    fields[id] = fields[id] ? `${fields[id]} ${message}` : message;
  }
  return { fields, form };
}

const FOCUSABLE = 'input, textarea, select, button, [tabindex]';

/**
 * After a render that shows errors on a different set of fields than before, moves focus to the first of them in `order`
 * (a field id is the `id` given to its `TextField` / `Select`). Does nothing while the set stays the same, so typing in a field
 * never pulls focus back.
 */
export function useFocusFirstError(fields: Record<string, string>, order: string[]): void {
  const first = order.find((id) => fields[id]);
  const erroredKey = Object.keys(fields)
    .filter((id) => fields[id])
    .sort()
    .join('\n');

  useEffect(() => {
    if (!first) return;
    const el = document.getElementById(first);
    if (!el) return;
    // A wrapper (e.g. the root of a Select) is not focusable itself; take the control inside it.
    const target = el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    // `first` follows from the errored set and `order`, so this runs only when the set changes.
  }, [erroredKey, first]);
}
