// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { pickDate, renderApp } from '@/test-utils/render-app';
import { Checkbox } from './Checkbox';
import { DateOfBirthField } from './DateOfBirthField';
import { GoogleButton } from './GoogleButton';
import { PasswordField } from './PasswordField';
import { Segmented } from './Segmented';
import { Select } from './Select';
import { Switch } from './Switch';
import { TextField } from './TextField';

vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

describe('ui fields', () => {
  it('a locked Switch cannot be turned on; pressing it shows the D6 line and the link to Plans', async () => {
    const onChange = vi.fn();
    renderApp(<Switch label="Kiểu câu có AI" isSelected={false} onChange={onChange} locked />);
    await userEvent.click(screen.getByRole('switch', { name: /Kiểu câu có AI/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Dành cho gói Pro.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem Gói học' })).toHaveAttribute('href', '/vi/app/plans');
  });

  it('a Switch turns on', async () => {
    const onChange = vi.fn();
    renderApp(<Switch label="Phát âm tự động" isSelected={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Phát âm tự động' }));
    expect(onChange).toHaveBeenCalledWith(true);
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

  it('TextField with an error is invalid and the error describes it', () => {
    renderApp(<TextField label="Email" value="lan@" onChange={vi.fn()} error="Email không hợp lệ." />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Email không hợp lệ.');
  });

  it('Checkbox: a press on a link inside the label does not toggle the box, the text around it still does', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderApp(
      <Checkbox isSelected={false} onChange={onChange}>
        Tôi đồng ý với <a href="/vi/terms" target="_blank">Điều khoản</a>
      </Checkbox>,
    );
    const link = screen.getByRole('link', { name: 'Điều khoản' });
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByText('Tôi đồng ý với', { exact: false }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Checkbox: a click on a link inside the label is not cancelled, so the link opens', async () => {
    const user = userEvent.setup();
    const { container } = renderApp(
      <Checkbox isSelected={false} onChange={vi.fn()}>
        Tôi đồng ý với <a href="/vi/terms" target="_blank">Điều khoản</a>
      </Checkbox>,
    );
    let defaultPrevented: boolean | null = null;
    container.addEventListener('click', (event) => { if ((event.target as HTMLElement).tagName === 'A') defaultPrevented = event.defaultPrevented; }, { once: true });
    await user.click(screen.getByRole('link', { name: 'Điều khoản' }));
    expect(defaultPrevented).toBe(false);
  });

  it('Segmented selects an option by click and by arrow key', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderApp(
      <Segmented label="Giao diện" value="light" onChange={onChange}
        options={[{ id: 'light', label: 'Sáng' }, { id: 'dark', label: 'Tối' }, { id: 'system', label: 'Theo hệ thống' }]} />,
    );
    await user.click(screen.getByRole('radio', { name: 'Tối' }));
    expect(onChange).toHaveBeenLastCalledWith('dark');
    screen.getByRole('radio', { name: 'Sáng' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('dark');
  });

  it('Segmented shows a count box after the label and keeps the name "Tất cả 61"', () => {
    renderApp(
      <Segmented label="Từ" value="all" onChange={() => {}} options={[{ id: 'all', label: 'Tất cả', count: 61 }, { id: 'due', label: 'Cần ôn', count: 3 }]} />,
    );
    expect(screen.getByRole('radio', { name: 'Tất cả 61' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Cần ôn 3' })).not.toBeChecked();
    expect(screen.getByText('61')).toBeInTheDocument();
  });

  it('Select picks an item and calls onChange with its id', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderApp(
      <Select label="Trình độ" value="a1" onChange={onChange} items={[{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2' }]} />,
    );
    await user.click(screen.getByRole('button', { name: /Trình độ/ }));
    await user.click(await screen.findByRole('option', { name: 'A2' }));
    expect(onChange).toHaveBeenCalledWith('a2');
  });
  it('PasswordField: the eye button shows and hides the password and is named by its action', async () => {
    const user = userEvent.setup();
    renderApp(<PasswordField label="Mật khẩu" value="Aa1!aaaa" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Mật khẩu');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(input).toHaveAttribute('type', 'text');
    const hide = screen.getByRole('button', { name: 'Ẩn mật khẩu' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    await user.click(hide);
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('PasswordField: pressing the eye button inside a form does not submit it', async () => {
    const user = userEvent.setup();
    const spy = vi.fn((event: React.FormEvent) => event.preventDefault());
    renderApp(
      <form onSubmit={spy}>
        <PasswordField label="Mật khẩu" value="x" onChange={vi.fn()} />
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('PasswordField: the label names only the input', () => {
    renderApp(<PasswordField label="Mật khẩu" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Mật khẩu').tagName).toBe('INPUT');
  });

  it('TextField: labelAside renders in the label row', () => {
    renderApp(<TextField label="Mật khẩu" value="" onChange={vi.fn()} labelAside={<a href="https://example.com/forgot">Quên mật khẩu?</a>} />);
    const link = screen.getByRole('link', { name: 'Quên mật khẩu?' });
    const label = screen.getByText('Mật khẩu', { selector: 'label' });
    expect(link.parentElement).toBe(label.parentElement);
  });
  it('GoogleButton: the mark is hidden from screen readers, has four paths, and a press calls onPress', async () => {
    const onPress = vi.fn();
    renderApp(<GoogleButton onPress={onPress}>Tiếp tục với Google</GoogleButton>);
    const button = screen.getByRole('button', { name: 'Tiếp tục với Google' });
    const svg = button.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelectorAll('path')).toHaveLength(4);
    await userEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('DateOfBirthField: an under-13 date shows the age line and reports null', () => {
    const onChange = vi.fn();
    renderApp(<DateOfBirthField label="Ngày sinh" onChange={onChange} today="2026-11-10" />);
    pickDate('Ngày sinh', '2015-01-01');
    expect(screen.getByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
    pickDate('Ngày sinh', '2000-05-12');
    expect(onChange).toHaveBeenLastCalledWith('2000-05-12');
  });

  it('DateOfBirthField: serverError tooYoung shows the same line', () => {
    renderApp(<DateOfBirthField label="Ngày sinh" onChange={vi.fn()} serverError="tooYoung" />);
    expect(screen.getByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
  });
});
