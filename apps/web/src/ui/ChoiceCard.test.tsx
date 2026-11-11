// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ChoiceCard, ChoiceCardGroup } from './ChoiceCard';

function Harness({ onChange, disabled }: { onChange?: (value: string) => void; disabled?: string }) {
  const [value, setValue] = useState('12');
  return (
    <ChoiceCardGroup
      label="Kỳ hạn"
      hideLabel
      value={value}
      onChange={(next) => { onChange?.(next); setValue(next); }}
    >
      <ChoiceCard value="1" title="1 tháng" trailing="79.000 ₫" isDisabled={disabled === '1'} />
      <ChoiceCard value="3" title="3 tháng" note="−16%" trailing="199.000 ₫" isDisabled={disabled === '3'} />
      <ChoiceCard value="12" title="12 tháng" note="−37% · tiết kiệm nhất" trailing="599.000 ₫" />
    </ChoiceCardGroup>
  );
}

describe('ChoiceCard (design §7.5, M7 Figma B §1.3)', () => {
  it('a group named by its label holds one radio per card', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Kỳ hạn' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /^12 tháng/ })).toBeChecked();
  });

  it('pressing the second card checks it and calls onChange("3")', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /^3 tháng/ }));
    expect(onChange).toHaveBeenCalledWith('3');
    expect(screen.getByRole('radio', { name: /^3 tháng/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^12 tháng/ })).not.toBeChecked();
  });

  it('Arrow Down moves the selection to the next card', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /^1 tháng/ }));
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('3');
    expect(screen.getByRole('radio', { name: /^3 tháng/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^3 tháng/ })).toHaveFocus();
  });

  it('the note and the trailing text are part of the radio name', () => {
    render(<Harness />);
    expect(screen.getByRole('radio', { name: /^3 tháng\s*−16%\s*199\.000 ₫$/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^1 tháng\s*79\.000 ₫$/ })).toBeInTheDocument();
  });

  it('a disabled card cannot be checked', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} disabled="3" />);
    const three = screen.getByRole('radio', { name: /^3 tháng/ });
    expect(three).toBeDisabled();
    await userEvent.click(three);
    expect(onChange).not.toHaveBeenCalled();
    expect(three).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^12 tháng/ })).toBeChecked();
  });
});
