import { createHmac } from 'node:crypto';

// payOS's webhook signature (launch prep B design §3.3). Written here, not taken from the SDK's `webhooks.verify`, which is `async`
// and compares with `!==`; `payos-signature.spec.ts` checks this code against the SDK on every kind of value so it cannot drift from payOS's algorithm.

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The keys of an object in ascending order (UTF-16 code units, like `Array.prototype.sort`); the SDK sorts an array element the same way. */
function sortKeys(object: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(object).sort().map((key) => [key, object[key]]));
}

/**
 * HMAC-SHA256, hex, over `key=value` pairs of the (signed) `data` object joined by `&` in key order, with no escaping:
 * a key whose value is `undefined` is left out; `null` and the strings `"null"` and `"undefined"` count as empty; an array is
 * `JSON.stringify` of its elements with each object element's keys sorted; anything else is its string form. The Checksum Key
 * is the HMAC key. Only `data` is signed, never the fields around it.
 */
export function signPayosData(data: Record<string, unknown>, checksumKey: string): string {
  const text = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined)
    .map((key) => {
      let value: unknown = data[key];
      if (Array.isArray(value)) value = JSON.stringify(value.map((element) => (isPlainObject(element) ? sortKeys(element) : element)));
      if (value === null || value === 'undefined' || value === 'null') value = '';
      return `${key}=${String(value)}`;
    })
    .join('&');
  return createHmac('sha256', checksumKey).update(text).digest('hex');
}
