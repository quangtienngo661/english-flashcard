// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { Faq } from './Faq';
import { FinalCta } from './FinalCta';
import { MetOutside } from './MetOutside';
import { Plans } from './Plans';
import { ReviewTiming } from './ReviewTiming';
import { appCopy, landing, renderLanding } from './test-utils';

describe('Plans', () => {
  // The seven lines of the two plans, as a table: the first three belong to Free and Pro alike, the last four only to Pro (owner 03/11/2026, a comparison table).
  // A string in the Free column is a limit ("15/tháng") instead of a tick.
  const lines: Array<[string, boolean | string, boolean]> = [
    [landing.plans.freeP1, true, true],
    [landing.plans.freeP2, true, true],
    [landing.plans.freeP3, true, true],
    [landing.plans.proP1, false, true],
    [landing.plans.proP2, landing.plans.freeAiPractice, true],
    [landing.plans.proP3, landing.plans.freeAiLookup, true],
    [landing.plans.proP4, false, true],
  ];

  it('P1 is a table with a column for Free and one for Pro and a row for each of the seven lines, each cell a Có or a Không', () => {
    renderLanding(<Plans copy={landing.plans} locale="vi" />);
    const table = within(screen.getByRole('table', { name: landing.plans.title }));
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([landing.plans.free, landing.plans.pro]);
    for (const [label, free, pro] of lines) {
      const row = table.getByRole('rowheader', { name: label }).closest('tr')!;
      expect(within(row).getAllByRole('cell').map((cell) => cell.textContent), label).toEqual([typeof free === 'string' ? free : free ? landing.plans.yes : landing.plans.no, pro ? landing.plans.yes : landing.plans.no]);
    }
  });

  it('P2 neither plan shows "Chưa mở bán" or a price', () => {
    const { container } = renderLanding(<Plans copy={landing.plans} locale="vi" />);
    expect(container).not.toHaveTextContent(/chưa mở bán|₫/i);
  });

  // LA3#16 (the other half is the default of the setting, pinned in settings.definitions.spec.ts and app-config.view.spec.ts).
  it('LA3#16 the Free cells of the two AI lines say 15/tháng and 5/tháng, as the defaults of the Free settings', () => {
    expect([landing.plans.freeAiPractice, landing.plans.freeAiLookup]).toEqual(['15/tháng', '5/tháng']);
    renderLanding(<Plans copy={landing.plans} locale="vi" />);
    const table = within(screen.getByRole('table', { name: landing.plans.title }));
    expect(within(table.getByRole('rowheader', { name: landing.plans.proP2 }).closest('tr')!).getAllByRole('cell')[0]).toHaveTextContent('15/tháng');
    expect(within(table.getByRole('rowheader', { name: landing.plans.proP3 }).closest('tr')!).getAllByRole('cell')[0]).toHaveTextContent('5/tháng');
  });

  it('C1 Đăng ký goes to the registration, and no line promises a trial (trials are off)', () => {
    const { container } = renderLanding(<Plans copy={landing.plans} locale="vi" />);
    expect(container).not.toHaveTextContent(/dùng thử|thẻ thanh toán/i);
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/vi/app/register');
  });
});

describe('Faq', () => {
  it('has the four questions sharing one name, the first open', () => {
    const { container } = renderLanding(<Faq copy={landing.faq} />);
    const details = [...container.querySelectorAll('details')];
    expect(details).toHaveLength(4);
    expect(new Set(details.map((d) => d.getAttribute('name'))).size).toBe(1);
    expect(details.map((d) => d.open)).toEqual([true, false, false, false]);
    expect(details.map((d) => d.querySelector('summary')!.textContent)).toEqual([landing.faq.q1, landing.faq.q2, landing.faq.q3, landing.faq.q4]);
  });

  it('LA3#16 the answer to "is it free" mentions the AI a Free account has and never says it has none', () => {
    expect(landing.faq.a2).toMatch(/AI/);
    expect(landing.faq.a2).not.toMatch(/không (có|dùng được) AI|chỉ có ở (gói )?Pro/i);
  });
});

describe('ReviewTiming', () => {
  it('marks its numbers as sample data and shows six boxes whose counts add up to the 430 in its title', () => {
    renderLanding(<ReviewTiming copy={landing.review} />);
    expect(screen.getByText(landing.review.sample)).toBeInTheDocument();
    expect(screen.getByText(landing.review.panelTitle)).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: landing.review.panelTitle })).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    expect(rows.reduce((sum, row) => sum + Number(row.lastElementChild!.textContent), 0)).toBe(430);
  });
});

describe('MetOutside', () => {
  it('shows the add-word box with the app labels and the saved sentence it becomes', () => {
    renderLanding(<MetOutside copy={landing.metOutside} app={appCopy} />);
    expect(screen.getByRole('heading', { level: 2, name: landing.metOutside.title })).toBeInTheDocument();
    expect(screen.getByText(appCopy.addWord.title)).toBeInTheDocument();
    expect(screen.getByText(landing.metOutside.savedLabel)).toBeInTheDocument();
  });
});

describe('FinalCta', () => {
  it('invites to register with the free note under the button', () => {
    renderLanding(<FinalCta copy={landing.final} locale="vi" />);
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/vi/app/register');
    expect(screen.getByText(landing.final.note)).toBeInTheDocument();
  });
});
