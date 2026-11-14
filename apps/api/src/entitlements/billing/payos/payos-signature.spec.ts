import { createHmac } from 'node:crypto';
import { PayOS } from '@payos/node';
import { describe, expect, it } from 'vitest';
import { signPayosData } from './payos-signature.js';

const KEY = 'test-checksum-key-not-a-real-one';
// The sample of payOS's webhook documentation: only `data` is signed.
const SAMPLE = {
  orderCode: 123, amount: 3000, description: 'VQRIO123', accountNumber: '12345678', reference: 'TF230204212323',
  transactionDateTime: '2023-02-04 18:25:00', currency: 'VND', paymentLinkId: '124c33293c43417ab7879e14c8d9eb18', code: '00',
  desc: 'Thành công', counterAccountBankId: '', counterAccountBankName: '', counterAccountName: '', counterAccountNumber: '',
  virtualAccountName: '', virtualAccountNumber: '',
};

// The official SDK, only to compare against: our own code never calls it for a signature (it compares with `!==`, design §3.3).
const sdk = new PayOS({ clientId: 'client', apiKey: 'api', checksumKey: KEY, logLevel: 'off' });
const sdkSignature = (data: Record<string, unknown>) => sdk.crypto.createSignatureFromObj(data as never, KEY);

describe('signPayosData (design §3.3)', () => {
  it('is HMAC-SHA256 hex over the keys sorted a–z, `key=value` joined by &, with no escaping', () => {
    const text = 'accountNumber=12345678&amount=3000&code=00&counterAccountBankId=&counterAccountBankName=&counterAccountName=&counterAccountNumber='
      + '&currency=VND&desc=Thành công&description=VQRIO123&orderCode=123&paymentLinkId=124c33293c43417ab7879e14c8d9eb18&reference=TF230204212323'
      + '&transactionDateTime=2023-02-04 18:25:00&virtualAccountName=&virtualAccountNumber=';
    const expected = createHmac('sha256', KEY).update(text).digest('hex');
    expect(signPayosData(SAMPLE, KEY)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not depend on the order the keys arrive in', () => {
    const shuffled = Object.fromEntries(Object.entries(SAMPLE).reverse());
    expect(signPayosData(shuffled, KEY)).toBe(signPayosData(SAMPLE, KEY));
  });

  it('a different key gives a different signature', () => {
    expect(signPayosData(SAMPLE, 'another-key')).not.toBe(signPayosData(SAMPLE, KEY));
  });

  it('changing any one value changes the signature', () => {
    const base = signPayosData(SAMPLE, KEY);
    for (const key of Object.keys(SAMPLE)) {
      const value = (SAMPLE as Record<string, unknown>)[key];
      const changed = { ...SAMPLE, [key]: typeof value === 'number' ? value + 1 : `${String(value)}x` };
      expect(signPayosData(changed, KEY), key).not.toBe(base);
    }
  });

  // The same algorithm as the SDK on every kind of value a body can hold (JSON has no `undefined`; the SDK drops such a key).
  const cases: Array<[string, Record<string, unknown>]> = [
    ['the documentation sample', SAMPLE],
    ['keys in another order', Object.fromEntries(Object.entries(SAMPLE).reverse())],
    ['null values', { ...SAMPLE, counterAccountName: null, virtualAccountNumber: null }],
    ['the strings "null" and "undefined", which the algorithm also empties', { ...SAMPLE, description: 'null', counterAccountName: 'undefined' }],
    ['a key whose value is undefined', { ...SAMPLE, counterAccountName: undefined }],
    ['numbers and booleans', { ...SAMPLE, amount: 0, orderCode: 34_359_738_367, flag: true, other: false, ratio: 0.5 }],
    ['an array of objects with unsorted keys', { ...SAMPLE, items: [{ name: 'a', amount: 1 }, { amount: 2, name: 'b' }] }],
    ['an empty array', { ...SAMPLE, items: [] }],
    ['characters outside ASCII and reserved in a query string', { ...SAMPLE, description: 'Chuyển & nhận = 100% #1', counterAccountName: 'NGUYEN VAN A' }],
  ];
  for (const [name, data] of cases) {
    it(`matches the SDK: ${name}`, async () => {
      expect(signPayosData(data, KEY)).toBe(await sdkSignature(data));
    });
  }

  it('the SDK accepts a body we signed and refuses one whose data changed after signing (the check that makes the comparison above matter)', async () => {
    const signature = signPayosData(SAMPLE, KEY);
    const body = { code: '00', desc: 'success', success: true, data: SAMPLE, signature };
    await expect(sdk.webhooks.verify(body)).resolves.toMatchObject({ orderCode: 123 });
    await expect(sdk.webhooks.verify({ ...body, data: { ...SAMPLE, amount: 3001 } })).rejects.toThrow();
  });
});
