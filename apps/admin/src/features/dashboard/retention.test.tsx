import { screen, within } from '@testing-library/react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import vi from '../../../messages/vi.json';
import { renderRouteTree } from '../../app/test-router';
import { RetentionCard } from './retention';
import type { Retention } from './retention-api';

const t = vi.dashboard.retention;

const DATA: Retention = {
  from: '2026-10-26', to: '2026-11-08', window_days: 7, today: { date: '2026-11-08', active: 12, stopped: 3 },
  cohorts: [
    { week_start: '2026-10-26', size: 5, d7: 3, d30: 1 },
    { week_start: '2026-11-02', size: 0, d7: null, d30: null },
  ],
};

function show(data: Retention, locale: 'vi' | 'en' = 'vi') {
  return renderRouteTree([{ path: '/', element: <RetentionCard data={data} /> }], { initialEntries: ['/'] }, (node) => (
    <IntlProvider locale={locale} messages={locale === 'en' ? en : vi} timeZone="Asia/Ho_Chi_Minh">{node}</IntlProvider>
  ));
}
const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement;
const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell', { hidden: true }).map((cell) => cell.textContent);
const rows = () => within(screen.getByRole('table', { hidden: true })).getAllByRole('row', { hidden: true }).slice(1);

describe('RetentionCard (nhóm B M6, D28: tiles and a table, no chart)', () => {
  it('shows who is learning today and who stopped, under the card title, with the window in the hint', () => {
    show(DATA);
    expect(screen.getByRole('heading', { level: 2, name: t.title })).toBeInTheDocument();
    expect(within(tile(t.active)).getByText('12')).toBeInTheDocument();
    expect(within(tile(t.stopped)).getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/trong 7 ngày gần nhất/)).toBeInTheDocument();
    expect(screen.getByText(/Không tính tài khoản admin, editor và tài khoản chưa xác nhận email/)).toBeInTheDocument();
  });

  it('the hint follows the window setting', () => {
    show({ ...DATA, window_days: 1 });
    expect(screen.getByText(/trong 1 ngày gần nhất/)).toBeInTheDocument();
  });

  it('the cohort table has the four columns, one row per week, oldest first', () => {
    show(DATA);
    expect(within(screen.getByRole('table', { hidden: true })).getAllByRole('columnheader', { hidden: true }).map((cell) => cell.textContent))
      .toEqual([t.cols.week, t.cols.size, t.cols.d7, t.cols.d30]);
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 3, name: t.cohorts })).toBeInTheDocument();
  });

  it('a week with people shows its size and D7 / D30 as share and count; a week nobody registered in shows 0 and dashes, never 0% (Review focus 4)', () => {
    show(DATA);
    const [first, second] = rows().map(cellsOf);
    expect(first[0]).toBe('Từ 26/10');
    expect(first[1]).toBe('5');
    expect(first[2]).toMatch(/^60\s?% \(3\/5\)$/);
    expect(first[3]).toMatch(/^20\s?% \(1\/5\)$/);
    expect(second).toEqual(['Từ 02/11', '0', '—', '—']);
  });

  it('a week that has people but has not reached day +7 or +30 shows a dash, while a real zero stays a number (B46)', () => {
    show({
      ...DATA,
      cohorts: [{ week_start: '2026-11-02', size: 4, d7: 0, d30: null }, { week_start: '2026-11-09', size: 3, d7: null, d30: null }],
    });
    const [old, young] = rows().map(cellsOf);
    expect(old[2]).toMatch(/^0\s?% \(0\/4\)$/);
    expect(old[3]).toBe('—');
    expect(young).toEqual(['Từ 09/11', '3', '—', '—']);
  });

  it('a share keeps one decimal at most: 1 of 3 is 33,3%, everybody is 100%', () => {
    show({ ...DATA, cohorts: [{ week_start: '2026-10-26', size: 3, d7: 1, d30: 3 }] });
    const [cells] = rows().map(cellsOf);
    expect(cells[2]).toMatch(/^33,3\s?% \(1\/3\)$/);
    expect(cells[3]).toMatch(/^100\s?% \(3\/3\)$/);
  });

  it('explains the dash under the table', () => {
    show(DATA);
    expect(screen.getByText(t.blank)).toBeInTheDocument();
  });

  it('nothing learned and nobody stopped is a pair of zeros, not an empty card', () => {
    show({ ...DATA, today: { date: '2026-11-08', active: 0, stopped: 0 } });
    expect(within(tile(t.active)).getByText('0')).toBeInTheDocument();
    expect(within(tile(t.stopped)).getByText('0')).toBeInTheDocument();
  });

  it('English: the same card with the English words, the month first, and a share with the window in the hint', () => {
    show(DATA, 'en');
    const e = en.dashboard.retention;
    expect(screen.getByRole('heading', { level: 3, name: e.cohorts })).toBeInTheDocument();
    expect(within(tile(e.active)).getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/in the last 7 days/)).toBeInTheDocument();
    const [first, second] = rows().map(cellsOf);
    expect(first[0]).toBe('From 10/26');
    expect(first[2]).toMatch(/^60\s?% \(3\/5\)$/);
    expect(second).toEqual(['From 11/02', '0', '—', '—']);
  });
});
