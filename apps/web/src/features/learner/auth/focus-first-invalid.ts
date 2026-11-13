'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

/** Focuses the first field of `form` marked `aria-invalid="true"` (for a checkbox, its input), in document order. */
export function focusFirstInvalid(form: HTMLElement | null) {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

/**
 * Audit T7 (13/11/2026): after a press shows errors, local or from the server, focus goes to the first wrong field, whose error is its
 * description and is read with it (T8). Call the returned function right after setting the errors; the focus moves once they render.
 * A counter, not the errors object, drives it: clearing one error while typing must not move focus.
 */
export function useFocusFirstInvalid(form: RefObject<HTMLElement | null>) {
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (request > 0) focusFirstInvalid(form.current);
  }, [request, form]);
  return useCallback(() => setRequest((n) => n + 1), []);
}
