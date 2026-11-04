// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { forgettingCurve } from './forgetting-curve';
import { landing, renderLanding } from './test-utils';
import { PHONE_CHART, WhyForget } from './WhyForget';

describe('WhyForget', () => {
  it('has the approved heading and the two reasons', () => {
    renderLanding(<WhyForget copy={landing.why} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Vì sao từ vựng nhanh bị quên' })).toBeInTheDocument();
    expect(screen.getByText(landing.why.r1Title)).toBeInTheDocument();
    expect(screen.getByText(landing.why.r2Title)).toBeInTheDocument();
  });

  it('draws the two curves from forgettingCurve() and one dot for each review before day 30, in a phone size and a wide size', () => {
    renderLanding(<WhyForget copy={landing.why} />);
    const figure = screen.getByRole('figure', { name: landing.why.figureLabel });
    const charts = figure.querySelectorAll('svg');
    expect(charts).toHaveLength(2);
    // LR49: the phone chart has a narrower viewBox, so its labels stay readable at 320 px.
    for (const [chart, curve] of [
      [charts[0], forgettingCurve(PHONE_CHART)],
      [charts[1], forgettingCurve()],
    ] as const) {
      expect([...chart.querySelectorAll('path')].map((p) => p.getAttribute('d'))).toEqual([curve.withoutReview, curve.withReview]);
      expect(chart.querySelectorAll('circle')).toHaveLength(curve.reviewDots.length);
    }
    expect(charts[0].getAttribute('viewBox')).toBe(`0 0 ${PHONE_CHART.width} ${PHONE_CHART.height}`);
    expect(figure).toHaveTextContent('Hình minh họa');
  });
});
