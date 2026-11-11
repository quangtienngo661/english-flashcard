export type Months = '1' | '3' | '12';
export type Prices = Record<Months, number>;

export type PeriodOffer = {
  price: number;
  /** months × the 1-month price, when that is more than `price`; the struck price on the card. */
  struck: number | null;
  /** The whole percent saved against `struck`. */
  saving: number | null;
  /** `price / months`, to the nearest 100 ₫ ("≈ 66.300 ₫ mỗi tháng"). */
  perMonth: number;
};

/**
 * What a period card of Gói học shows (M7 Figma B §1.3): every number comes from the API's prices, none is drawn in. 199.000 for 3 months
 * against 79.000 a month is struck 237.000, −16 %, about 66.300 a month.
 */
export function periodOffer(prices: Prices, months: Months): PeriodOffer {
  const count = Number(months);
  const price = prices[months];
  const full = count * prices['1'];
  const struck = full > price ? full : null;
  return {
    price,
    struck,
    saving: struck === null ? null : Math.round((1 - price / struck) * 100),
    perMonth: Math.round(price / count / 100) * 100,
  };
}

/** The period with the largest whole-percent saving ("tiết kiệm nhất"), or null when none saves at least 1 %. */
export function bestPeriod(prices: Prices): '3' | '12' | null {
  let best: '3' | '12' | null = null;
  let most = 0;
  for (const months of ['3', '12'] as const) {
    const saving = periodOffer(prices, months).saving ?? 0;
    if (saving > most) {
      best = months;
      most = saving;
    }
  }
  return best;
}
