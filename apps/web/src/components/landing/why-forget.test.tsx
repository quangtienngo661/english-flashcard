// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { forgettingCurve } from './forgetting-curve';
import { landing, renderLanding } from './test-utils';
import { WhyForget } from './WhyForget';

describe('WhyForget', () => {
  it('has the approved heading and the two reasons', () => {
    renderLanding(<WhyForget copy={landing.why} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Vì sao từ vựng nhanh bị quên' })).toBeInTheDocument();
    expect(screen.getByText(landing.why.r1Title)).toBeInTheDocument();
    expect(screen.getByText(landing.why.r2Title)).toBeInTheDocument();
  });

  it('draws the two curves from forgettingCurve() and one dot for each review before day 30', () => {
    const { container } = renderLanding(<WhyForget copy={landing.why} />);
    const curve = forgettingCurve();
    const figure = screen.getByRole('figure', { name: landing.why.figureLabel });
    expect([...figure.querySelectorAll('svg path')].map((p) => p.getAttribute('d'))).toEqual([curve.withoutReview, curve.withReview]);
    expect(container.querySelectorAll('svg circle')).toHaveLength(curve.reviewDots.length);
    expect(figure).toHaveTextContent('Hình minh họa');
  });
});
