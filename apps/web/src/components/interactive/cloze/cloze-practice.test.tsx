// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClozePractice, type ClozeItem, type ClozeLabels } from './ClozePractice';

const items: ClozeItem[] = [
  { id: 'deploy', before: 'We plan to', answer: 'deploy', after: 'the new version.', options: ['deploy', 'delay', 'deliver', 'decide'], hint: 'Hint one', explanation: 'deploy = release', translation: 'VI one' },
  { id: 'assume', before: "Don't", answer: 'assume', after: 'that.', options: ['assume', 'resume', 'consume', 'assure'], hint: 'Hint two', explanation: 'assume = believe', translation: 'VI two' },
];

const labels: ClozeLabels = {
  headers: ['Try it 1/2', 'Try it 2/2'], sourceChip: 'Saved', instruction: 'Choose', correctTitle: 'Correct!', wrongTitle: 'Not quite',
  nextSentence: 'Continue', doneTitle: 'Done', doneBody: 'Body', doneCta: 'Notify me', replay: 'Again', region: 'Practice sample',
};

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

// jsdom has no Web Animations API; `land()` settles the current flight.
let land: () => void = () => {};
const animate = vi.fn(() => {
  let resolve!: () => void;
  const finished = new Promise<void>((r) => (resolve = r));
  land = resolve;
  return { finished, cancel: vi.fn() } as unknown as Animation;
});

const gap = () => screen.getByTestId('cloze-gap');
const sticker = (name: string) => screen.getByRole('button', { name });
const flyers = () => document.querySelectorAll('[data-flyer]');
const renderPractice = () => render(<ClozePractice items={items} labels={labels} ctaHref="#waitlist-hero" />);

beforeEach(() => {
  mockReducedMotion(false);
  animate.mockClear();
  Element.prototype.animate = animate as unknown as Element['animate'];
});

afterEach(() => {
  delete (Element.prototype as { animate?: unknown }).animate;
});

describe('ClozePractice', () => {
  it('LP20 the live region announces the wrong title, then the correct title with explanation and translation', async () => {
    const user = userEvent.setup();
    renderPractice();
    const live = screen.getByTestId('cloze-live');
    await user.click(sticker('delay'));
    expect(live).toHaveTextContent('Not quite');
    expect(screen.getByText('Hint one')).toBeInTheDocument();
    await user.click(sticker('deploy'));
    expect(live).toHaveTextContent('Correct!');
    expect(screen.getByText('deploy = release')).toBeInTheDocument();
    expect(screen.getByText('VI one')).toBeInTheDocument();
  });

  it('UBE15 a wrong sticker becomes aria-disabled and keeps focus', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(sticker('delay'));
    expect(sticker('delay')).toHaveAttribute('aria-disabled', 'true');
    expect(sticker('delay')).toHaveFocus();
    expect(sticker('deliver')).not.toHaveAttribute('aria-disabled');
  });

  it('UBE16 the right sticker dims the others and moves focus to the next button', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(sticker('deploy'));
    for (const option of ['delay', 'deliver', 'decide']) expect(sticker(option)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('UBC4 next through every sentence shows Done; Again returns to sentence 1', async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    renderPractice();
    expect(screen.getByText('Try it 1/2')).toBeInTheDocument();
    await user.click(sticker('deploy'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Try it 2/2')).toBeInTheDocument();
    await user.click(sticker('assume'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Notify me' })).toHaveAttribute('href', '#waitlist-hero');
    await user.click(screen.getByRole('button', { name: 'Again' }));
    expect(screen.getByText('Try it 1/2')).toBeInTheDocument();
    expect(gap()).not.toHaveTextContent('deploy');
  });

  it('UBE1 with reduced motion a right pick never calls animate and fills the gap at once', async () => {
    mockReducedMotion(true);
    const user = userEvent.setup();
    renderPractice();
    await user.click(sticker('deploy'));
    expect(animate).not.toHaveBeenCalled();
    expect(gap()).toHaveTextContent('deploy');
  });

  it('with motion the gap shows ? until the sticker lands, then the answer', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(sticker('deploy'));
    expect(animate).toHaveBeenCalledTimes(1);
    expect(gap()).not.toHaveTextContent('deploy');
    await act(async () => land());
    expect(gap()).toHaveTextContent('deploy');
    expect(flyers()).toHaveLength(0);
  });

  it('UBE8 next during the flight leaves no [data-flyer] and shows the new sentence', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.click(sticker('deploy'));
    expect(flyers()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(flyers()).toHaveLength(0);
    expect(screen.getByText('Try it 2/2')).toBeInTheDocument();
  });

  it('RF3 unmounting during the flight leaves no [data-flyer] in document.body', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPractice();
    await user.click(sticker('deploy'));
    expect(flyers()).toHaveLength(1);
    unmount();
    expect(flyers()).toHaveLength(0);
  });

  it('UBE14 a double click on the right sticker animates once', async () => {
    const user = userEvent.setup();
    renderPractice();
    await user.dblClick(sticker('deploy'));
    expect(animate).toHaveBeenCalledTimes(1);
  });
});
