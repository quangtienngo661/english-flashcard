// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClozeCarousel, type ClozeItem, type ClozeLabels } from './ClozeCarousel';

const items: ClozeItem[] = [
  { id: 'deploy', before: 'We plan to', answer: 'deploy', after: 'the new version.', options: ['deploy', 'delay', 'deliver', 'decide'], hint: 'Hint one', explanation: 'deploy = release', translation: 'VI one' },
  { id: 'assume', before: "Don't", answer: 'assume', after: 'that.', options: ['assume', 'resume', 'consume', 'assure'], hint: 'Hint two', explanation: 'assume = believe', translation: 'VI two' },
];

const labels: ClozeLabels = {
  headers: ['Try it 1/2', 'Try it 2/2'], sourceChip: 'Saved', instruction: 'Choose', prev: 'Previous sentence', next: 'Next sentence',
  correctTitle: 'Correct!', wrongTitle: 'Not quite', nextSentence: 'Continue', doneTitle: 'Done', doneBody: 'Body', doneCta: 'Notify me',
  replay: 'Again', region: 'Practice sample',
};

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

const activeSlide = () => screen.getAllByRole('group').find((g) => g.dataset.active === 'true')!;

beforeEach(() => mockReducedMotion(false));

describe('ClozeCarousel', () => {
  it('LP20 the live region announces the wrong title, then the correct title with explanation and translation', async () => {
    const user = userEvent.setup();
    render(<ClozeCarousel items={items} labels={labels} ctaHref="#waitlist-hero" />);
    const live = screen.getByTestId('cloze-live');
    await user.click(within(activeSlide()).getByRole('button', { name: 'delay' }));
    expect(live).toHaveTextContent('Not quite');
    expect(within(activeSlide()).getByText('Hint one')).toBeInTheDocument();
    await user.click(within(activeSlide()).getByRole('button', { name: 'deploy' }));
    expect(live).toHaveTextContent('Correct!');
    expect(within(activeSlide()).getByText('deploy = release')).toBeInTheDocument();
    expect(within(activeSlide()).getByText('VI one')).toBeInTheDocument();
  });

  it('LP21 ArrowRight/ArrowLeft on the focused region change the sentence; prev/next buttons have accessible names', async () => {
    const user = userEvent.setup();
    render(<ClozeCarousel items={items} labels={labels} ctaHref="#waitlist-hero" />);
    const region = screen.getByRole('region', { name: 'Practice sample' });
    region.focus();
    await user.keyboard('{ArrowRight}');
    expect(activeSlide()).toHaveAccessibleName('Try it 2/2');
    await user.keyboard('{ArrowLeft}');
    expect(activeSlide()).toHaveAccessibleName('Try it 1/2');
    expect(screen.getByRole('button', { name: 'Previous sentence' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next sentence' }));
    expect(activeSlide()).toHaveAccessibleName('Try it 2/2');
  });

  it('option buttons expose aria-pressed for the picked option and are disabled after correct', async () => {
    const user = userEvent.setup();
    render(<ClozeCarousel items={items} labels={labels} ctaHref="#waitlist-hero" />);
    const delay = within(activeSlide()).getByRole('button', { name: 'delay' });
    await user.click(delay);
    expect(delay).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(activeSlide()).getByRole('button', { name: 'deploy' }));
    for (const option of ['deploy', 'delay', 'deliver', 'decide']) {
      expect(within(activeSlide()).getByRole('button', { name: option })).toBeDisabled();
    }
  });

  it('LP21 continuing past the last sentence shows Done, and Again returns to sentence 1', async () => {
    const user = userEvent.setup();
    render(<ClozeCarousel items={items} labels={labels} ctaHref="#waitlist-hero" />);
    await user.click(screen.getByRole('button', { name: 'Next sentence' }));
    await user.click(within(activeSlide()).getByRole('button', { name: 'assume' }));
    await user.click(within(activeSlide()).getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notify me' })).toHaveAttribute('href', '#waitlist-hero');
    await user.click(screen.getByRole('button', { name: 'Again' }));
    expect(activeSlide()).toHaveAccessibleName('Try it 1/2');
  });

  it('LPE9 with reduced motion, changing the sentence adds no transition classes', async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    render(<ClozeCarousel items={items} labels={labels} ctaHref="#waitlist-hero" />);
    await user.click(screen.getByRole('button', { name: 'Next sentence' }));
    for (const slide of screen.getAllByRole('group')) expect(slide.className).not.toMatch(/transition/);
  });
});
