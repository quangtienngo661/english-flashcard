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
import { BacklogPage } from '@/features/learner/groups/BacklogPage';
import { GroupPage } from '@/features/learner/groups/GroupPage';
import { HouseAd } from '@/features/learner/house-ad/HouseAd';
import { PracticePage } from '@/features/learner/practice/PracticePage';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { SkeletonPage } from './Skeleton';
import { showToast, ToastRegion } from './Toast';

const GID = '22222222-2222-4222-8222-222222222222';
const nav = vi.hoisted(() => ({ path: '/vi/app', listeners: new Set<() => void>() }));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => { nav.listeners.add(listener); return () => nav.listeners.delete(listener); };
  const params = new URLSearchParams({ id: '22222222-2222-4222-8222-222222222222' });
  return {
    usePathname: () => useSyncExternalStore(subscribe, () => nav.path, () => nav.path),
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
    useSearchParams: () => params,
  };
});
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

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

  it.each(['chrome', 'columns', 'carousel', 'bare'] as const)('SkeletonPage %s is one status named Đang tải…', (shape) => {
    renderApp(<SkeletonPage shape={shape} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status', { name: 'Đang tải…' })).toBeInTheDocument();
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
  // Control for the "not outline" proof below: the shared Button does mark itself, so a missing mark means "not a Button".
  it('control: the shared Button with variant="secondary" renders data-variant', () => {
    renderApp(<Button variant="secondary">Hủy</Button>);
    expect(screen.getByRole('button', { name: 'Hủy' })).toHaveAttribute('data-variant', 'secondary');
  });

  describe('dialog sweep, dialogs inside pages', () => {
    const pool = { limit: 3, used: 0, remaining: 3, resets_at: null };
    const SUMMARY = { id: GID, name: 'IELTS', version: 1, total: 4, today: { priority: 0, due: 0, new: 0 }, cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: 1, due: 0 })), backlog: 1, available: { due: 0, new: 0 } };
    const backlogRow = { item_id: '00000000-0000-4000-8000-000000000001', sense_id: 's1', level: 2, due_date: '2026-08-01', days_overdue: 61,
      content: { lemma: 'word1', pos: 'noun', meaning: { text: 'nghĩa 1', language: 'vi', translation_missing: false }, examples: [] } };
    const ENT = { plan: 'free', sources: [], pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool }, features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } }, trial_eligible: false, ai_available: { enabled: true, cap_reached: false }, ads: { show: true, interstitial_per_day: 3, min_interval_minutes: 10 } };
    const CFG = {
      practice: { max_questions_per_session: 20, default_questions_per_session: 12, session_max_mode: 'fixed', ai_max_mode: 'percent', ai_max_fixed: 5, ai_max_percent: 50, ai_placement: 'even', scope_questions_max: 100 },
      reminders: { send_time: '20:00' }, learning: { backlog_after_days: 60, groups_per_user: 100 },
      plans: { free: { practice_sessions_per_day: 3 }, trial: { ai_practice_per_cycle: 100, ai_lookup_per_cycle: 30 }, pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100, prices: { '1': 79000 } } },
    };
    const routes = {
      [`GET /v1/groups/${GID}`]: () => Response.json({ id: GID, name: 'IELTS', version: 1, item_count: 4, removable_items: 3, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' }),
      'GET /v1/groups': () => Response.json({ items: [SUMMARY] }),
      [`GET /v1/groups/${GID}/backlog?page_size=100`]: () => Response.json({ items: [backlogRow], next_page_token: null }),
      [`GET /v1/groups/${GID}/items?content=true&page_size=50`]: () => Response.json({ items: [], next_page_token: null }),
      'GET /v1/me/app-config': () => Response.json(CFG),
      'GET /v1/me/entitlements': () => Response.json(ENT),
      'GET /v1/practice/sessions/current': () => Response.json({ type: 'http://x/problems/not-found', status: 404, title: 'n' }, { status: 404 }),
      'GET /v1/practice/weak-words/groups': () => Response.json({ total: 0, items: [] }),
      'GET /v1/practice/weak-words?page_size=2': () => Response.json({ items: [], next_page_token: null }),
      'GET /v1/practice/history?page_size=3': () => Response.json({ items: [], next_page_token: null }),
    };
    const expectFrame = async (close: string, cancel?: string) => {
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getAllByRole('button', { name: close }).filter((b) => b.querySelector('svg'))).toHaveLength(1);
      if (cancel) {
        const textual = within(dialog).getAllByRole('button', { name: cancel }).filter((b) => !b.querySelector('svg'));
        expect(textual).toHaveLength(1);
        expect(textual[0]).not.toHaveAttribute('data-variant');
      }
    };

    it('BacklogPage: the forget confirm has the × and a text cancel', async () => {
      renderApp(<BacklogPage />, { chrome: true, routes });
      await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn word1' }, { timeout: 5000 }));
      await userEvent.click(screen.getByRole('button', { name: 'Bỏ khỏi việc học' }));
      await expectFrame('Đóng', 'Giữ lại');
    });

    it('GroupPage: the delete-group confirm has the × and a text cancel', async () => {
      renderApp(<GroupPage />, { chrome: true, routes });
      await userEvent.click(await screen.findByRole('button', { name: 'Tùy chọn nhóm' }, { timeout: 5000 }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Xóa nhóm' }));
      await expectFrame('Đóng', 'Giữ nhóm');
    });

    it('HouseAd: the Pro dialog shown after a navigation has the × and a text "Để sau"', async () => {
      localStorage.clear();
      nav.path = '/vi/app';
      renderApp(<HouseAd />, { routes });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
      await act(async () => { nav.path = '/vi/app/groups'; nav.listeners.forEach((listener) => listener()); });
      await screen.findByRole('dialog', { name: 'Học nhiều hơn với Pro' });
      await expectFrame('Đóng', 'Để sau');
    });

    it('CustomizeDialog: has the × (it has no cancel; Bắt đầu is its only footer action)', async () => {
      renderApp(<PracticePage />, { routes });
      const list = await screen.findByRole('list', { name: 'Luyện theo nguồn khác' });
      await userEvent.click(within(list).getByRole('button', { name: 'Tùy chỉnh: Theo nhóm' }));
      const dialog = await screen.findByRole('dialog', { name: /Tùy chỉnh phiên/ });
      expect(within(dialog).getAllByRole('button', { name: 'Đóng' }).filter((b) => b.querySelector('svg'))).toHaveLength(1);
    });
  });

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
      { name: 'DeckPickerDialog', ui: () => <DeckPickerDialog sense={SENSE} inGroups={[]} onClose={noop} />, close: 'Đóng', cancel: 'Hủy' },
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
