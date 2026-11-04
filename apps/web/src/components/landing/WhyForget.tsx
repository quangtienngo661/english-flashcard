import { Container } from '@/components/ui/Container';
import type { LandingCopy } from './copy';
import { forgettingCurve } from './forgetting-curve';

// Below md the chart is drawn in a narrower viewBox, so that its 16-unit labels come out at 12 px or more on a 320 px phone instead of 8 (LR49).
export const PHONE_CHART = { width: 300, height: 200 };

function Chart({ copy, className, width = 600, height = 230 }: { copy: LandingCopy['why']; className: string; width?: number; height?: number }) {
  const curve = forgettingCurve({ width, height });
  const axis = height - 38;
  const right = width - 16;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="presentation" className={`h-auto w-full overflow-visible ${className}`}>
      <line x1="40" y1={axis} x2={right} y2={axis} className="stroke-canvas-deep" strokeWidth="2" />
      <line x1="40" y1="16" x2="40" y2={axis} className="stroke-canvas-deep" strokeWidth="2" />
      <path d={curve.withoutReview} fill="none" className="stroke-danger" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      <path d={curve.withReview} fill="none" className="stroke-primary" strokeWidth="3.5" strokeLinejoin="round" />
      {curve.reviewDots.map((dot) => (
        <circle key={dot.x} cx={dot.x} cy={dot.y} r="6" className="fill-accent stroke-ink" strokeWidth="2" />
      ))}
      {curve.ticks.map((tick) => (
        <text key={tick.day} x={tick.x} y={axis + 22} textAnchor={tick.day === 30 ? 'end' : 'middle'} className="fill-muted" fontSize="16" fontWeight="600">
          {tick.day === 30 ? copy.axisDays : tick.day}
        </text>
      ))}
      <text x="0" y="22" className="fill-muted" fontSize="16" fontWeight="600">
        {copy.axisRemember}
      </text>
    </svg>
  );
}

// "Vì sao từ vựng nhanh bị quên" (design landing-redesign §3): two reasons and an illustration of memory fading, with and without review.
// The figure is an illustration, not data, and says so in its legend.
export function WhyForget({ copy }: { copy: LandingCopy['why'] }) {
  return (
    <section id="vi-sao" aria-labelledby="why-title" className="scroll-mt-16 bg-surface py-14 md:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-5 lg:gap-16">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <h2 id="why-title" className="text-h2 font-extrabold text-balance text-ink">
            {copy.title}
          </h2>
          <div>
            <b className="block text-title text-ink">{copy.r1Title}</b>
            <p className="text-body text-ink">{copy.r1Body}</p>
          </div>
          <div>
            <b className="block text-title text-ink">{copy.r2Title}</b>
            <p className="text-body text-ink">{copy.r2Body}</p>
          </div>
        </div>
        <figure aria-label={copy.figureLabel} className="flex flex-col gap-3 rounded-card bg-canvas p-5 md:p-6 lg:col-span-3">
          <Chart copy={copy} className="md:hidden" {...PHONE_CHART} />
          <Chart copy={copy} className="hidden md:block" />
          <figcaption className="flex flex-wrap gap-x-6 gap-y-1 text-small text-muted">
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-0 w-6 border-t-3 border-primary" />
              {copy.legendYes}
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-0 w-6 border-t-3 border-dotted border-danger" />
              {copy.legendNo}
            </span>
            <span>{copy.legendNote}</span>
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}
