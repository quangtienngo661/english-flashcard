// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import userEvent from '@testing-library/user-event';
import { appCopy, landing, renderLanding } from '../test-utils';
import { AppShowcase } from './AppShowcase';

const tab = (name: string) => screen.getByRole('tab', { name });
const tabs = () => screen.getAllByRole('tab');

describe('AppShowcase', () => {
  it('LR3 opening "Tra từ" leaves exactly one visible panel, the lookup one', async () => {
    const user = userEvent.setup();
    renderLanding(<AppShowcase copy={landing.showcase} app={appCopy} />);
    await user.click(tab(landing.showcase.tabs.lookup));
    const panels = screen.getAllByRole('tabpanel');
    expect(panels).toHaveLength(1);
    expect(within(panels[0]).getByRole('heading', { level: 2, name: 'Tra cứu từ vựng' })).toBeInTheDocument();
    expect(tab(landing.showcase.tabs.lookup)).toHaveAttribute('aria-selected', 'true');
    expect(tab(landing.showcase.tabs.review)).toHaveAttribute('aria-selected', 'false');
  });

  it('LR4 arrow keys move the selection and the focus, End and Home jump to the ends', async () => {
    const user = userEvent.setup();
    renderLanding(<AppShowcase copy={landing.showcase} app={appCopy} />);
    tab(landing.showcase.tabs.review).focus();
    await user.keyboard('{ArrowRight}');
    expect(tab(landing.showcase.tabs.groups)).toHaveFocus();
    expect(tab(landing.showcase.tabs.groups)).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(tabs().at(-1)).toHaveFocus();
    expect(tabs().at(-1)).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(tabs()[0]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(tabs().at(-1)).toHaveFocus();
  });

  it('LR26 all five panels are in the DOM from the start, four of them hidden, so no-JS reading keeps the markup', () => {
    const { container } = renderLanding(<AppShowcase copy={landing.showcase} app={appCopy} />);
    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(5);
    expect([...panels].filter((p) => p.hasAttribute('hidden'))).toHaveLength(4);
  });

  it('LR5 the review card turns over on a click and shows the meaning on its back', async () => {
    const user = userEvent.setup();
    renderLanding(<AppShowcase copy={landing.showcase} app={appCopy} />);
    const card = screen.getByRole('button', { name: new RegExp(appCopy.review.flip) });
    const meaning = screen.getByText(landing.showcase.review.meaning);
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(meaning.closest('[aria-hidden="true"]')).not.toBeNull();
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(landing.showcase.review.meaning).closest('[aria-hidden="true"]')).toBeNull();
  });

  it('the review buttons carry the app words and the card counter is filled in', () => {
    renderLanding(<AppShowcase copy={landing.showcase} app={appCopy} />);
    expect(screen.getByText(appCopy.review.stillLearning)).toBeInTheDocument();
    expect(screen.getByText(appCopy.review.know)).toBeInTheDocument();
    expect(screen.getByText('Thẻ 4 trên 29')).toBeInTheDocument();
  });

  it('D4 the add-word sample says what the app says, with the app word for the past form', () => {
    renderLanding(<AppShowcase copy={landing.showcase} app={appCopy} />);
    expect(screen.getByText(appCopy.addWord.title, { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('Wordmet nhận ra đây là quá khứ của go và đã gắn sẵn.')).toBeInTheDocument();
    expect(screen.getByText('Lưu go')).toBeInTheDocument();
  });

  // renderLanding gives its provider the App messages, which hides this: the app gives client components none (app/[locale]/layout.tsx,
  // `messages={null}`), so anything in this client component that reads App messages shows its key and logs MISSING_MESSAGE (seen in CI).
  it('the window needs no client messages: under the production provider nothing logs MISSING_MESSAGE or shows a message key', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <NextIntlClientProvider locale="vi" messages={null} timeZone="UTC">
        <AppShowcase copy={landing.showcase} app={appCopy} />
      </NextIntlClientProvider>,
    );
    expect(errors.mock.calls.flat().map(String).filter((line) => line.includes('MISSING_MESSAGE'))).toEqual([]);
    expect(document.body).not.toHaveTextContent('App.chrome');
    errors.mockRestore();
  });
});
