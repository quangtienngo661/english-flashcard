type Props = {
  /** Names the chart for screen readers, e.g. "Chi phí theo ngày". */
  label: string;
  days: Array<{ date: string; value: number }>;
  /** The text of one bar's tooltip, e.g. "25/10: 1.240 ₫". */
  describe: (day: { date: string; value: number }) => string;
};

const BAR = 10;
const HEIGHT = 100;

/** One bar per day, scaled to the largest day; a zero day keeps a thin line so the gap is visible. No chart library. */
export function DayBars({ label, days, describe }: Props) {
  const max = Math.max(...days.map((day) => day.value), 0);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${days.length * BAR} ${HEIGHT}`} preserveAspectRatio="none" className="h-32 w-full">
      {days.map((day, index) => {
        const height = max === 0 ? 1 : Math.max(1, (day.value / max) * (HEIGHT - 4));
        return (
          <rect key={day.date} x={index * BAR + 1} y={HEIGHT - height} width={BAR - 2} height={height} className="fill-primary">
            <title>{describe(day)}</title>
          </rect>
        );
      })}
    </svg>
  );
}
