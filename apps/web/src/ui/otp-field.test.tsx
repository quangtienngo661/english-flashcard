// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderApp } from '@/app-ui/test-utils';
import { OtpField } from './OtpField';

vi.mock('next/navigation', () => ({ usePathname: () => '/vi/app', useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

function Harness({ spy, initial = '' }: { spy?: (v: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <OtpField
      label="Mã 6 số trong email"
      digitLabel={(n) => `Chữ số ${n}`}
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

const box = (n: number) => screen.getByRole('textbox', { name: `Chữ số ${n}` });

describe('OtpField', () => {
  it('pasting "48 1205" fills all six boxes and leaves focus on box 6', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    renderApp(<Harness spy={spy} />);
    await user.click(box(3));
    await user.paste('48 1205');
    expect(spy).toHaveBeenLastCalledWith('481205');
    expect([1, 2, 3, 4, 5, 6].map((n) => (box(n) as HTMLInputElement).value).join('')).toBe('481205');
    expect(box(6)).toHaveFocus();
  });

  it('typing 4 then 8 moves focus to box 3', async () => {
    const user = userEvent.setup();
    renderApp(<Harness />);
    await user.click(box(1));
    await user.keyboard('48');
    expect(box(3)).toHaveFocus();
  });

  it('Backspace twice from an empty box 3 moves focus to box 1', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    renderApp(<Harness spy={spy} />);
    await user.click(box(3));
    await user.keyboard('{Backspace}');
    expect(box(2)).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(box(1)).toHaveFocus();
  });

  it('typing 7 into a filled box keeps only the 7', async () => {
    const user = userEvent.setup();
    renderApp(<Harness initial="481205" />);
    await user.click(box(4));
    await user.keyboard('{End}7');
    expect(box(4)).toHaveValue('7');
  });

  // Final review: the phone's or a password manager's one-time-code autofill puts the whole code into box 1 as one change.
  it('an autofilled code in box 1 fills all six boxes', () => {
    const spy = vi.fn();
    renderApp(<Harness spy={spy} />);
    fireEvent.change(box(1), { target: { value: '482913' } });
    expect(spy).toHaveBeenLastCalledWith('482913');
    expect([1, 2, 3, 4, 5, 6].map((n) => (box(n) as HTMLInputElement).value).join('')).toBe('482913');
    expect(box(6)).toHaveFocus();
  });

  it('typing before the digit of a filled box keeps the new digit', async () => {
    const user = userEvent.setup();
    renderApp(<Harness initial="481205" />);
    await user.click(box(4));
    await user.keyboard('{Home}3');
    expect(box(4)).toHaveValue('3');
  });

  it('the group is named by the label and box 1 offers the one-time code', () => {
    renderApp(<Harness />);
    expect(screen.getByRole('group', { name: 'Mã 6 số trong email' })).toBeInTheDocument();
    expect(box(1)).toHaveAttribute('autocomplete', 'one-time-code');
    expect(box(2)).toHaveAttribute('autocomplete', 'off');
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });
});
