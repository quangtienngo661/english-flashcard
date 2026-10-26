// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateOfBirthField } from './DateOfBirthField';
import { Dialog } from './Dialog';
import { Switch } from './Switch';
import { TextField } from './TextField';
import { renderApp } from './test-utils';

vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

function DialogHarness() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog isOpen={open} onOpenChange={setOpen} title="Tạo nhóm">
      <p>nội dung</p>
    </Dialog>
  );
}

describe('UI kit', () => {
  it('Dialog is a dialog named by its title and closes on Escape', async () => {
    renderApp(<DialogHarness />);
    expect(screen.getByRole('dialog', { name: 'Tạo nhóm' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Dialog overlay dims with navy, not ink (ink is light in dark mode; audit 26/10/2026 #3)', () => {
    renderApp(<DialogHarness />);
    const overlay = screen.getByRole('dialog').closest('.fixed.inset-0');
    expect(overlay?.className).toContain('bg-navy/45');
    expect(overlay?.className).not.toMatch(/\bbg-ink\//);
  });

  it('DateOfBirthField shows the under-13 line from the copy doc and reports null', async () => {
    const onChange = vi.fn();
    renderApp(<DateOfBirthField label="Ngày sinh" today="2026-10-18" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Ngày sinh' }), '19/10/2013');
    await userEvent.tab();
    expect(screen.getByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('DateOfBirthField reports the ISO date when valid', async () => {
    const onChange = vi.fn();
    renderApp(<DateOfBirthField label="Ngày sinh" today="2026-10-18" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Ngày sinh' }), '18/10/2013');
    expect(onChange).toHaveBeenLastCalledWith('2013-10-18');
  });

  it('DateOfBirthField says an impossible date is invalid', async () => {
    renderApp(<DateOfBirthField label="Ngày sinh" today="2026-10-18" onChange={() => {}} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Ngày sinh' }), '31/02/2010');
    await userEvent.tab();
    expect(screen.getByText(/Nhập ngày sinh theo dạng/)).toBeInTheDocument();
  });

  it('a locked Switch cannot be turned on; pressing it shows the D6 line and the link to Plans', async () => {
    const onChange = vi.fn();
    renderApp(<Switch label="Kiểu câu có AI" isSelected={false} onChange={onChange} locked />);
    await userEvent.click(screen.getByRole('switch', { name: /Kiểu câu có AI/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Dành cho gói Pro. Gói Pro chưa mở bán.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem Gói học' })).toHaveAttribute('href', '/vi/app/plans');
  });

  it('TextField with a counter shows "12/60"', async () => {
    function Harness() {
      const [v, setV] = useState('');
      return <TextField label="Tên nhóm" value={v} onChange={setV} maxLength={60} showCount />;
    }
    renderApp(<Harness />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên nhóm' }), 'Du lịch Nhật');
    expect(screen.getByText('12/60')).toBeInTheDocument();
  });
});
