// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { renderApp } from '@/test-utils/render-app';
import { AnswerOption } from './AnswerOption';
import { KeyLegend } from './KeyLegend';
import { ProgressBar } from './ProgressBar';
import { Stepper } from './Stepper';

describe('ui practice kit', () => {
  it('AnswerOption shows the note of its state: "Bạn chọn" on the wrong pick, "Đáp án đúng" on the right one', () => {
    renderApp(
      <>
        <AnswerOption state="wrong" label="dominate" kbd="3" note="Bạn chọn" />
        <AnswerOption state="correct" label="deteriorate" kbd="1" note="Đáp án đúng" />
        <AnswerOption state="dim" label="evaporate" kbd="4" />
        <AnswerOption state="idle" label="accumulate" kbd="2" />
      </>,
      { chrome: false },
    );
    expect(screen.getByRole('button', { name: /dominate/ })).toHaveTextContent('Bạn chọn');
    expect(screen.getByRole('button', { name: /deteriorate/ })).toHaveTextContent('Đáp án đúng');
    expect(screen.getByRole('button', { name: /evaporate/ })).toHaveTextContent(/^4evaporate$/);
    expect(screen.getByRole('button', { name: /accumulate/ })).toHaveTextContent(/^2accumulate$/);
  });

  it('AnswerOption calls onPress with its press, and not once disabled', () => {
    const onPress = vi.fn();
    const { rerender } = renderApp(<AnswerOption state="idle" label="deploy" kbd="1" onPress={onPress} />, { chrome: false });
    fireEvent.click(screen.getByRole('button', { name: /deploy/ }));
    expect(onPress).toHaveBeenCalledOnce();
    rerender(<AnswerOption state="dim" label="deploy" kbd="1" onPress={onPress} isDisabled />);
    fireEvent.click(screen.getByRole('button', { name: /deploy/ }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('ProgressBar is a progressbar with value 7 of 20 and its label', () => {
    renderApp(<ProgressBar value={7} max={20} label="Tiến độ phiên" />, { chrome: false });
    const bar = screen.getByRole('progressbar', { name: 'Tiến độ phiên' });
    expect(bar).toHaveAttribute('aria-valuenow', '7');
    expect(bar).toHaveAttribute('aria-valuemax', '20');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
  });

  function Harness({ start, onChange }: { start: number; onChange: (v: number) => void }) {
    const [value, setValue] = useState(start);
    return <Stepper label="Số câu" value={value} min={1} max={3} onChange={(v) => { setValue(v); onChange(v); }} />;
  }

  it('Stepper: minus is disabled at min, plus at max, and each press moves the value by exactly one', () => {
    const onChange = vi.fn();
    renderApp(<Harness start={1} onChange={onChange} />, { chrome: false });
    const minus = screen.getByRole('button', { name: 'Số câu: bớt 1' });
    const plus = screen.getByRole('button', { name: 'Số câu: thêm 1' });
    const field = screen.getByRole('textbox', { name: 'Số câu' });
    expect(field).toHaveValue('1');
    expect(minus).toBeDisabled();
    expect(plus).toBeEnabled();
    fireEvent.click(plus);
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(plus);
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(plus).toBeDisabled();
    expect(minus).toBeEnabled();
    fireEvent.click(minus);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(field).toHaveValue('2');
  });

  it('Stepper with min equal to max disables both buttons', () => {
    renderApp(<Stepper label="Câu AI" value={0} min={0} max={0} onChange={() => {}} />, { chrome: false });
    expect(screen.getByRole('button', { name: 'Câu AI: bớt 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Câu AI: thêm 1' })).toBeDisabled();
  });

  it('Stepper: typing 2 and pressing Enter commits 2', async () => {
    const onChange = vi.fn();
    renderApp(<Harness start={1} onChange={onChange} />, { chrome: false });
    const field = screen.getByRole('textbox', { name: 'Số câu' });
    await userEvent.clear(field);
    await userEvent.type(field, '2{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(field).toHaveValue('2');
  });

  it('Stepper: typing 99 and leaving the field commits the max, 3', async () => {
    const onChange = vi.fn();
    renderApp(<Harness start={1} onChange={onChange} />, { chrome: false });
    const field = screen.getByRole('textbox', { name: 'Số câu' });
    await userEvent.clear(field);
    await userEvent.type(field, '99');
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(field).toHaveValue('3');
  });

  it('Stepper: an emptied field restores the previous value on blur and never reports NaN', async () => {
    const onChange = vi.fn();
    renderApp(<Harness start={2} onChange={onChange} />, { chrome: false });
    const field = screen.getByRole('textbox', { name: 'Số câu' });
    await userEvent.clear(field);
    await userEvent.tab();
    expect(field).toHaveValue('2');
    expect(onChange.mock.calls.some(([v]) => Number.isNaN(v))).toBe(false);
  });

  it('Stepper: ArrowUp adds one and ArrowDown takes one off', async () => {
    const onChange = vi.fn();
    renderApp(<Harness start={2} onChange={onChange} />, { chrome: false });
    const field = screen.getByRole('textbox', { name: 'Số câu' });
    field.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('Stepper: a disabled field cannot be typed into and both buttons are off', async () => {
    const onChange = vi.fn();
    renderApp(<Stepper label="Số câu" value={2} min={1} max={3} onChange={onChange} isDisabled />, { chrome: false });
    const field = screen.getByRole('textbox', { name: 'Số câu' });
    expect(field).toBeDisabled();
    await userEvent.type(field, '3{Enter}');
    expect(field).toHaveValue('2');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Số câu: bớt 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Số câu: thêm 1' })).toBeDisabled();
  });

  it('KeyLegend lists each key cap with its label', () => {
    renderApp(<KeyLegend items={[{ keys: ['Enter'], label: 'Đã biết' }, { keys: ['1'], label: 'Cần ôn lại' }, { keys: ['Esc'], label: 'Dừng phiên' }]} />, { chrome: false });
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['EnterĐã biết', '1Cần ôn lại', 'EscDừng phiên']);
  });
});
