// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { TargetWord } from './TargetWord';

// Part 10 P.4 (mockup L136): the word being learned, bold and underlined in accent, inside its example sentence.
describe('TargetWord', () => {
  it('wraps "mitigated" in one strong for the lemma mitigate', () => {
    const { container } = render(<p><TargetWord text="They mitigated the risk" lemma="mitigate" /></p>);
    expect(screen.getAllByRole('strong').map((el) => el.textContent)).toEqual(['mitigated']);
    expect(container.textContent).toBe('They mitigated the risk');
  });

  it('matches case-insensitively', () => {
    render(<p><TargetWord text="Mitigate it" lemma="mitigate" /></p>);
    expect(screen.getByRole('strong')).toHaveTextContent(/^Mitigate$/);
  });

  it('leaves the text unchanged when the word is not there', () => {
    const { container } = render(<p><TargetWord text="Nothing here" lemma="mitigate" /></p>);
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
    expect(container.textContent).toBe('Nothing here');
  });

  it('finds an irregular form from forms as a whole word', () => {
    render(<p><TargetWord text="Gone are the days we went out" lemma="go" forms={['went', 'gone']} /></p>);
    expect(screen.getByRole('strong')).toHaveTextContent(/^Gone$/);
  });

  it('prefers the whole word over an earlier word that only starts with the lemma', () => {
    render(<p><TargetWord text="Goals matter, so go" lemma="go" /></p>);
    expect(screen.getByRole('strong')).toHaveTextContent(/^go$/);
  });

  it('falls back to a word that starts with the lemma, a final e dropped ("making" for make)', () => {
    render(<p><TargetWord text="She is making tea" lemma="make" /></p>);
    expect(screen.getByRole('strong')).toHaveTextContent(/^making$/);
  });

  it('treats regex characters in the lemma as text', () => {
    const { container } = render(<p><TargetWord text="a (b) c" lemma="(b" /></p>);
    expect(container.textContent).toBe('a (b) c');
  });
});
