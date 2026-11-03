// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { Faq } from './Faq';
import { FinalCta } from './FinalCta';
import { MetOutside } from './MetOutside';
import { Plans } from './Plans';
import { ReviewTiming } from './ReviewTiming';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { appCopy, landing, renderLanding } from './test-utils';

describe('Plans', () => {
  // The seven lines of the two plans, as a table: the first three belong to Free and Pro alike, the last four only to Pro (owner 03/11/2026, a comparison table).
  const lines: Array<[string, boolean, boolean]> = [
    [landing.plans.freeP1, true, true],
    [landing.plans.freeP2, true, true],
    [landing.plans.freeP3, true, true],
    [landing.plans.proP1, false, true],
    [landing.plans.proP2, false, true],
    [landing.plans.proP3, false, true],
    [landing.plans.proP4, false, true],
  ];

  it('P1 is a table with a column for Free and one for Pro and a row for each of the seven lines, each cell a Có or a Không', () => {
    renderLanding(<Plans copy={landing.plans} locale="vi" />);
    const table = within(screen.getByRole('table', { name: landing.plans.title }));
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([landing.plans.free, landing.plans.pro]);
    for (const [label, free, pro] of lines) {
      const row = table.getByRole('rowheader', { name: label }).closest('tr')!;
      expect(within(row).getAllByRole('cell').map((cell) => cell.textContent), label).toEqual([free ? landing.plans.yes : landing.plans.no, pro ? landing.plans.yes : landing.plans.no]);
    }
  });

  it('P2 neither plan shows "Chưa mở bán" or a price', () => {
    const { container } = renderLanding(<Plans copy={landing.plans} locale="vi" />);
    expect(container).not.toHaveTextContent(/chưa mở bán|₫/i);
  });

  it('C1 the Pro column carries the trial line, and Đăng ký goes to the registration', () => {
    renderLanding(<Plans copy={landing.plans} locale="vi" />);
    expect(screen.getByText('Dùng thử 7 ngày, cần thẻ thanh toán. Hủy trước hạn không mất phí.')).toBeInTheDocument();
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

describe('SiteFooter', () => {
  it('L4 has the anchors and the contact link and no language link', () => {
    renderLanding(<SiteFooter locale="vi" copy={{ ...landing.footer, contact: 'Liên hệ', copyright: '© 2026 Wordmet' }} />);
    expect(screen.getByRole('link', { name: landing.footer.plans })).toHaveAttribute('href', '/vi#goi');
    expect(screen.getByRole('link', { name: landing.footer.faq })).toHaveAttribute('href', '/vi#hoi-dap');
    expect(screen.getByRole('link', { name: 'Liên hệ' }).getAttribute('href')).toMatch(/^mailto:/);
    expect(screen.queryByRole('link', { name: /english/i })).toBeNull();
  });
});
