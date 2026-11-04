// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appCopy, landing, renderLanding } from '../test-utils';
import { ExerciseGallery } from './ExerciseGallery';

const items = landing.exercises.items;
const renderGallery = () => renderLanding(<ExerciseGallery copy={landing.exercises} kinds={appCopy.kinds} />);
const pickers = () => within(screen.getByRole('list', { name: landing.exercises.list })).getAllByRole('button');
const option = (name: RegExp) => screen.getByRole('button', { name });
const pick = async (user: ReturnType<typeof userEvent.setup>, index: number) => user.click(pickers()[index]);
const nextButton = () => screen.getByRole('button', { name: new RegExp(landing.exercises.next) });

describe('ExerciseGallery', () => {
  it('lists the seven kinds with the app names, the AI ones carrying the Câu AI chip', () => {
    renderGallery();
    const list = pickers();
    expect(list).toHaveLength(7);
    expect(list[0]).toHaveTextContent(appCopy.kinds.mcq);
    expect(list.filter((b) => b.textContent?.includes(appCopy.kinds.cloze))).toHaveLength(2);
    expect(list.filter((b) => b.textContent?.includes(landing.exercises.aiChip))).toHaveLength(3);
    expect(list.filter((b) => b.textContent?.includes(landing.exercises.pro))).toHaveLength(3);
  });

  it('LR46 offers the same seven kinds as one drop-down, each naming its plan, and choosing one opens it', async () => {
    const user = userEvent.setup();
    renderGallery();
    const select = screen.getByRole('combobox', { name: landing.exercises.list });
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(7);
    expect(options[0]).toHaveTextContent(appCopy.kinds.mcq);
    expect(options[0]).toHaveTextContent(landing.exercises.free);
    expect(options.filter((o) => o.textContent?.includes(landing.exercises.pro))).toHaveLength(3);
    await user.selectOptions(select, options[2]);
    expect(screen.getByRole('textbox', { name: landing.exercises.answerLabel })).toBeInTheDocument();
    expect(pickers()[2]).toHaveAttribute('aria-pressed', 'true');
  });

  it('LR6 a wrong choice marks it wrong and the right one right, locks the options and focuses the next button', async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(option(/delay/));
    expect(option(/delay/)).toHaveAttribute('data-state', 'wrong');
    expect(option(/deploy/)).toHaveAttribute('data-state', 'right');
    for (const name of [/deploy/, /delay/, /deliver/, /decide/]) expect(option(name)).toBeDisabled();
    expect(screen.getByRole('button', { name: landing.exercises.again })).toBeInTheDocument();
    expect(nextButton()).toHaveFocus();
  });

  it('LR6 the number keys choose an option, as in the app', async () => {
    const user = userEvent.setup();
    renderGallery();
    option(/deploy/).focus();
    await user.keyboard('2');
    expect(option(/delay/)).toHaveAttribute('data-state', 'wrong');
  });

  it('LR7 a wrong typed answer shows Lần 1, the hint and reveal buttons and no verdict box, and keeps the field selected', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 2);
    const field = screen.getByRole('textbox', { name: landing.exercises.answerLabel });
    await user.type(field, 'x');
    await user.click(screen.getByRole('button', { name: landing.exercises.check }));
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Lần 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(landing.exercises.hintLabel) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: landing.exercises.reveal })).toBeInTheDocument();
    expect(screen.queryByText(/Đúng rồi|Chưa đúng/)).toBeNull();
    expect(field).toHaveFocus();
    expect((field as HTMLInputElement).selectionEnd).toBe(1);
  });

  it('LR8 the hint shows its text once and is then disabled', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 2);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: landing.exercises.check }));
    const hint = screen.getByRole('button', { name: new RegExp(landing.exercises.hintLabel) });
    await user.click(hint);
    expect(screen.getByText(items.typeMeaning.hint)).toBeInTheDocument();
    expect(hint).toBeDisabled();
  });

  it('LR9 Xem đáp án puts the answer in the locked field, marked revealed', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 2);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: landing.exercises.check }));
    await user.click(screen.getByRole('button', { name: landing.exercises.reveal }));
    const field = screen.getByRole('textbox');
    expect(field).toHaveValue('assume');
    expect(field).toHaveAttribute('readonly');
    expect(field).toHaveAttribute('data-state', 'revealed');
  });

  // Final review 03/11/2026: the locked field still takes focus, and Enter in it used to grade the old wrong try again.
  it('LR9 a revealed answer stays revealed: Enter in the locked field does not grade the old try again', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 2);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: landing.exercises.check }));
    await user.click(screen.getByRole('button', { name: landing.exercises.reveal }));
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.keyboard('{Enter}');
    expect(field).toHaveValue('assume');
    expect(field).toHaveAttribute('data-state', 'revealed');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText('Lần 2')).toBeNull();
  });

  // Same review: the same message set twice changes nothing in the DOM, so a screen reader heard only the first wrong try.
  it('LR7 every wrong try is announced in the live region, not only the first', async () => {
    const user = userEvent.setup();
    const { container } = renderGallery();
    await pick(user, 2);
    const live = () => container.querySelector('[aria-live="polite"]')?.textContent;
    await user.type(screen.getByRole('textbox'), 'aaa{Enter}');
    const first = live();
    expect(first, 'the first wrong try is announced').toContain(landing.exercises.wrong);
    await user.keyboard('bbb{Enter}');
    expect(live()).toContain(landing.exercises.wrong);
    expect(live()).not.toBe(first);
  });

  it('LRE4 spaces and capitals around the right answer still count as right', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 2);
    await user.type(screen.getByRole('textbox'), ' Assume ');
    await user.click(screen.getByRole('button', { name: landing.exercises.check }));
    expect(screen.getByRole('textbox')).toHaveAttribute('data-state', 'right');
    expect(nextButton()).toHaveFocus();
  });

  it('LRE5 an empty field cannot be checked', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 2);
    expect(screen.getByRole('button', { name: landing.exercises.check })).toBeDisabled();
  });

  it('LR10 Dạng bài tiếp theo on the last kind returns to the first and focuses its picker', async () => {
    const user = userEvent.setup();
    renderGallery();
    await pick(user, 6);
    await user.click(option(/lend/));
    await user.click(nextButton());
    expect(pickers()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(pickers()[0]).toHaveFocus();
  });

  it('Làm lại clears the answer so the same kind can be tried again', async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(option(/delay/));
    await user.click(screen.getByRole('button', { name: landing.exercises.again }));
    expect(option(/delay/)).not.toBeDisabled();
    expect(option(/delay/)).toHaveAttribute('data-state', 'idle');
  });

  it('C1 no kind shows an instruction line or a report link', async () => {
    const user = userEvent.setup();
    renderGallery();
    for (let i = 0; i < 7; i++) {
      await pick(user, i);
      expect(screen.queryByText(/Báo lỗi|Chọn từ có nghĩa này|Gõ từ còn thiếu|in đậm/)).toBeNull();
    }
  });
});
