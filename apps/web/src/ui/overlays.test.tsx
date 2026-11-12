// @vitest-environment jsdom
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderApp } from '@/test-utils/render-app';
import { AddSentenceSheet } from '@/features/learner/add-word/AddSentenceSheet';
import { AddWordSheet } from '@/features/learner/add-word/AddWordSheet';
import { BulkAddSheet } from '@/features/learner/add-word/BulkAddSheet';
import { DeckPickerDialog } from '@/features/learner/add-word/DeckPickerDialog';
import { CreateGroupDialog } from '@/features/learner/groups/GroupDialogs';
import { SubscriptionRows } from '@/features/learner/plans/SubscriptionRows';
import { ResumeDialog } from '@/features/learner/practice/CurrentSessionCard';
import { ReportDialog } from '@/features/learner/practice/session/ReportDialog';
import { TransactionDetail } from '@/features/learner/transactions/TransactionDetail';
import { DeleteMyWordDialog, EditMyWordDialog } from '@/features/learner/word/MyWordDialogs';
import { SavedSentencesDialog } from '@/features/learner/word/SavedSentencesDialog';
import { Dialog } from './Dialog';
import { SkeletonPage } from './Skeleton';
import { showToast, ToastRegion } from './Toast';

vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

function Harness({ isDismissable = true, onOpenChange }: { isDismissable?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button">bên ngoài</button>
      <Dialog
        isOpen={open}
        onOpenChange={(next) => { onOpenChange?.(next); setOpen(next); }}
        title="Tạo nhóm"
        closeLabel="Đóng"
        isDismissable={isDismissable}
      >
        <p>nội dung</p>
      </Dialog>
    </>
  );
}

describe('ui overlays', () => {
  it('an open Dialog is a dialog named by its title; Esc closes it', async () => {
    const onOpenChange = vi.fn();
    renderApp(<Harness onOpenChange={onOpenChange} />);
    expect(screen.getByRole('dialog', { name: 'Tạo nhóm' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the close button named by closeLabel closes it', async () => {
    renderApp(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('with isDismissable={false}, a click outside does not close it', async () => {
    renderApp(<Harness isDismissable={false} />);
    await userEvent.click(document.body);
    expect(screen.getByRole('dialog', { name: 'Tạo nhóm' })).toBeInTheDocument();
  });

  it('SkeletonPage is a status that says Đang tải…', () => {
    renderApp(<SkeletonPage shape="chrome" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải…');
  });

  it('showToast shows its text in the region', async () => {
    renderApp(<ToastRegion />);
    act(() => showToast('Đã lưu', 'success'));
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  });

  it.each([
    ['md', 'md:max-w-lg'],
    ['lg', 'md:max-w-2xl'],
    ['xl', 'md:max-w-215'],
  ] as const)('size="%s" gives the dialog its max width (%s); xl is the 860 px box of Overlay 4', (size, width) => {
    renderApp(<Dialog isOpen onOpenChange={() => {}} title="Hộp" closeLabel="Đóng" size={size}><p>x</p></Dialog>);
    const modal = screen.getByRole('dialog', { name: 'Hộp' }).parentElement!;
    expect(modal.className.split(' ')).toContain(width);
  });

  it('tone="pro" keeps the name and Esc, and adds the 2 px accent border; the default tone has none (giao diện mới M7.11)', async () => {
    const onOpenChange = vi.fn();
    renderApp(<Dialog isOpen onOpenChange={onOpenChange} title="Học nhiều hơn với Pro" closeLabel="Đóng" tone="pro"><p>x</p></Dialog>);
    const modal = screen.getByRole('dialog', { name: 'Học nhiều hơn với Pro' }).parentElement!;
    expect(modal.className.split(' ')).toEqual(expect.arrayContaining(['border-2', 'border-wm-accent']));
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('the default tone has no border', () => {
    renderApp(<Dialog isOpen onOpenChange={() => {}} title="Hộp" closeLabel="Đóng"><p>x</p></Dialog>);
    expect(screen.getByRole('dialog', { name: 'Hộp' }).parentElement!.className.split(' ')).not.toContain('border-wm-accent');
  });

  // Part 10 P.4 (mockup L383): every dialog shows the × (closeLabel is required); `wide` is gone (R62 ends).
  it('the × is always there, a button named by closeLabel, and the dialog takes no wide prop', () => {
    renderApp(
      // @ts-expect-error wide was removed in Part 10 P.4; size="lg" replaces it.
      <Dialog isOpen onOpenChange={() => {}} title="Hộp" closeLabel="Đóng hộp" wide>
        <p>x</p>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'Đóng hộp' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Hộp' }).parentElement!.className.split(' ')).toContain('md:max-w-lg');
  });

  it('showToast with a link shows it in the toast', async () => {
    renderApp(<ToastRegion />);
    act(() => showToast('Đã thêm', 'success', { link: { label: 'Xem nhóm', href: '/vi/app/group?id=g1' } }));
    expect(await screen.findByRole('link', { name: 'Xem nhóm' })).toHaveAttribute('href', '/vi/app/group?id=g1');
  });

  it('showToast with a timeout closes it after exactly that long; the default stays 5000 ms', async () => {
    vi.useFakeTimers();
    try {
      renderApp(<ToastRegion />);
      act(() => showToast('Ngắn', 'success', { timeout: 2400 }));
      act(() => showToast('Mặc định', 'neutral'));
      act(() => vi.advanceTimersByTime(2399));
      expect(screen.getByText('Ngắn')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByText('Ngắn')).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(5000 - 2400 - 1));
      expect(screen.getByText('Mặc định')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByText('Mặc định')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // Part 10 P.15 (chỗ 11): every dialog has the × box named by its close label, and its cancel is a text button, not an outline `Button`
  // (the shared `Button` marks itself with data-variant; `TextButton` does not).
  describe('dialog sweep', () => {
    const noop = () => {};
    const SENSE = { sense_id: 's1', lemma: 'rizz', pos: 'noun', meaning: { text: 'sức hút' }, sentence_count: 0 };
    const PAGE_SENSE = { ...SENSE, entry_id: 'e1', scope: 'private', level: 'B2', context_label: null, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false } as never;
    const TX = {
      id: 't1', kind: 'purchase', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: '2026-10-15T02:12:00.000Z',
      period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-15T02:12:00.000Z', status: 'succeeded', provider: 'payos', provider_transaction_id: 'WM-1',
    } as never;
    const SOURCE = { kind: 'subscription', id: 'x1', status: 'active', starts_at: '2026-10-01T00:00:00.000Z', ends_at: null, renews_at: '2026-12-01T00:00:00.000Z', cancel_at_period_end: false, pending_interval: null } as never;
    const CURRENT = { session: { id: 'p1', target_count: 12, source: 'today' }, answered: [] } as never;
    const cases: Array<{ name: string; ui: () => React.ReactElement; close: string; cancel?: string; open?: string }> = [
      { name: 'AddSentenceSheet', ui: () => <AddSentenceSheet sense={SENSE} onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'AddWordSheet', ui: () => <AddWordSheet onClose={noop} />, close: 'Đóng' },
      { name: 'BulkAddSheet', ui: () => <BulkAddSheet filter={{}} onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'DeckPickerDialog', ui: () => <DeckPickerDialog sense={SENSE} onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'CreateGroupDialog', ui: () => <CreateGroupDialog onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'ResumeDialog', ui: () => <ResumeDialog current={CURRENT} groups={[]} isOpen onClose={noop} onResume={noop} onStartNew={noop} busy={false} />, close: 'Đóng' },
      { name: 'ReportDialog', ui: () => <ReportDialog itemId="i1" kind="non_ai" subtitle="x" isOpen onClose={noop} onSent={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'TransactionDetail', ui: () => <TransactionDetail item={TX} onClose={noop} />, close: 'Đóng chi tiết giao dịch', cancel: 'Đóng' },
      { name: 'EditMyWordDialog', ui: () => <EditMyWordDialog sense={PAGE_SENSE} onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'DeleteMyWordDialog', ui: () => <DeleteMyWordDialog sense={PAGE_SENSE} onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
      { name: 'SavedSentencesDialog', ui: () => <SavedSentencesDialog lemma="rizz" senseId="s1" onClose={noop} />, close: 'Đóng' },
      { name: 'SubscriptionRows', ui: () => <SubscriptionRows sources={[SOURCE]} />, close: 'Đóng', cancel: 'Giữ gói', open: 'Hủy gói' },
    ];
    it.each(cases)('$name: one × named by its close label; its cancel is a text button', async ({ ui, close, cancel, open }) => {
      renderApp(ui());
      if (open) await userEvent.click(await screen.findByRole('button', { name: open }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getAllByRole('button', { name: close }).filter((b) => b.querySelector('svg'))).toHaveLength(1);
      if (cancel) {
        const buttons = within(dialog).getAllByRole('button', { name: cancel });
        const textual = buttons.filter((b) => !b.querySelector('svg'));
        expect(textual).toHaveLength(1);
        expect(textual[0]).not.toHaveAttribute('data-variant');
      }
    });
  });
});
