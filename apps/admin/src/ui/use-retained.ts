import { useState } from 'react';

/** `value`, or the last defined value while it is `undefined`: keeps a closing panel's content on screen while it animates out. */
export function useRetained<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
