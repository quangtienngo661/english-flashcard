// An illustration, not a measurement: memory fades after each meeting, and each review (1, 3, 7, 14, 30 days, the app's boxes)
// makes it fade more slowly. Coordinates are in a 600 × 230 viewBox: days on x from 40 to 584, memory on y from 16 (full) to 192 (zero).
const LEFT = 40;
const RIGHT_MARGIN = 16;
const TOP = 16;
const BOTTOM_MARGIN = 38;
const LAST_DAY = 30;
// How slowly memory fades after the k-th meeting (days per e-fold); the first is the first meeting itself.
const FADE_DAYS = [1.6, 3.5, 7, 14, 28];
const NO_REVIEW_FADE_DAYS = 2;
const STEPS_PER_STRETCH = 12;

type Options = { reviews?: number[]; width?: number; height?: number };

export function forgettingCurve({ reviews = [1, 3, 7, 14, 30], width = 600, height = 230 }: Options = {}) {
  const plotWidth = width - RIGHT_MARGIN - LEFT;
  const plotHeight = height - BOTTOM_MARGIN - TOP;
  const x = (day: number) => LEFT + (day / LAST_DAY) * plotWidth;
  const y = (memory: number) => TOP + (1 - memory) * plotHeight;
  const point = (day: number, memory: number) => `${x(day).toFixed(1)},${y(memory).toFixed(1)}`;

  const without: string[] = [];
  for (let day = 0; day <= LAST_DAY; day += 0.5) without.push(point(day, Math.exp(-day / NO_REVIEW_FADE_DAYS)));

  const withReview: string[] = [];
  let from = 0;
  reviews.forEach((review, k) => {
    for (let step = 0; step <= STEPS_PER_STRETCH; step++) {
      const day = from + ((review - from) * step) / STEPS_PER_STRETCH;
      withReview.push(point(day, Math.exp(-(day - from) / FADE_DAYS[Math.min(k, FADE_DAYS.length - 1)])));
    }
    if (review < LAST_DAY) withReview.push(point(review, 1));
    from = review;
  });

  return {
    withReview: `M${withReview.join(' L')}`,
    withoutReview: `M${without.join(' L')}`,
    reviewDots: reviews.filter((r) => r < LAST_DAY).map((r) => ({ x: x(r), y: y(1) })),
    ticks: reviews.map((day) => ({ day, x: x(day) })),
  };
}
