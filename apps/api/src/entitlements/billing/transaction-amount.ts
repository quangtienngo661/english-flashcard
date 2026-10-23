/** A provider's amount in major units → the currency's smallest unit (learner UI design §8.9), e.g. 4.99 USD → 499. */
export function toMinorUnits(amount: number, currency: string): number {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return Math.round(amount * 10 ** digits);
}
