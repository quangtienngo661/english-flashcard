import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { evalRoutes } from './prompt-test-support';

const t = vi.ai.eval.bulk;
const BULK = 'POST /v1/admin/ai/eval/examples/bulk';
const HEADER = 'word,part_of_speech,level,meaning_vi,context_label,note';
const count = (text: string, n: number) => text.replace('{count}', String(n));

async function openBulk(over = {}) {
  const r = renderApp('/ai/eval/bulk', evalRoutes(over));
  const dialog = await screen.findByRole('dialog', { name: t.title });
  return { r, dialog };
}
// Pasting through `user.type` would read `{` and `[` as key commands; a change event sets the text as the browser does on paste.
const paste = (dialog: HTMLElement, text: string) => fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: text } });
const bodyOf = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/ai/eval/examples/bulk')[0]?.body as {
  operation: string; rows: Array<{ input: Record<string, unknown>; note: string | null; expected?: unknown; split?: string }>;
};

describe('BulkExamplesDialog (/ai/eval/bulk)', () => {
  it('[Nhập hàng loạt] opens the dialog; the hint names the columns of the operation; nothing to submit yet', async () => {
    const r = renderApp('/ai/eval', evalRoutes());
    await userEvent.click(await screen.findByRole('button', { name: t.add }));
    const dialog = await screen.findByRole('dialog', { name: t.title });
    expect(r.router.state.location.pathname).toBe('/ai/eval/bulk');
    expect(dialog).toHaveTextContent('word, part_of_speech, level, meaning_vi, context_label');
    expect(within(dialog).getByRole('button', { name: count(t.submit, 0) })).toBeDisabled();
  });

  it('pasted text: counts the readable lines, then POSTs every row with its input and note', async () => {
    const { r, dialog } = await openBulk({ [BULK]: () => Response.json({ total: 2, valid: 2, created: 2, invalid: [] }) });
    paste(dialog, `${HEADER}\ndeploy,verb,B1,triển khai,,natural\nrhythm,noun,B2,nhịp điệu,music,`);
    expect(await within(dialog).findByText(count(t.readable, 2))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: count(t.submit, 2) }));
    expect(await screen.findByText(count(t.added, 2))).toBeInTheDocument();
    expect(bodyOf(r.calls)).toEqual({
      operation: 'generate_cloze',
      rows: [
        { input: { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null }, note: 'natural' },
        { input: { word: 'rhythm', part_of_speech: 'noun', level: 'B2', meaning_vi: 'nhịp điệu', context_label: 'music' }, note: null },
      ],
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a chosen file fills the box with its text, the same path as paste', async () => {
    const { dialog } = await openBulk();
    const file = new File([`${HEADER}\ndeploy,verb,B1,x,,\nrun,verb,A2,y,,`], 'examples.csv', { type: 'text/csv' });
    await userEvent.upload(dialog.querySelector('input[type="file"]') as HTMLInputElement, file);
    expect(await within(dialog).findByText(count(t.readable, 2))).toBeInTheDocument();
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toContain('deploy,verb,B1');
    expect(within(dialog).getByText('examples.csv')).toBeInTheDocument();
  });

  it('owner 28/10/2026: the right rows go in, a wrong one is skipped and listed by its line in the file', async () => {
    const { dialog } = await openBulk({
      [BULK]: () => Response.json({ total: 4, valid: 3, created: 3, invalid: [{ row: 2, violations: ['input.meaning_vi: Must not be blank'] }] }),
    });
    // File line 3 is the second row; line 4 has more cells than the header and never reaches the API.
    paste(dialog, `word,meaning_vi\na,b\nc,\nd,e,f\ng,h`);
    await userEvent.click(await within(dialog).findByRole('button', { name: count(t.submit, 3) }));
    expect(await screen.findByText(count(t.added, 3))).toBeInTheDocument();
    expect(screen.getByText(count(t.skipped, 2))).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      `${t.line.replace('{line}', '3')}input.meaning_vi: Must not be blank`,
      `${t.line.replace('{line}', '4')}${t.reasons.columns}`,
    ]);
    await userEvent.click(screen.getByRole('button', { name: vi.common.close }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a header with an unknown column: the problem names it and nothing can be sent', async () => {
    const { r, dialog } = await openBulk();
    paste(dialog, 'word,meaningvi\ndeploy,x');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('meaningvi');
    expect(within(dialog).getByRole('button', { name: count(t.submit, 0) })).toBeDisabled();
    expect(r.calls.filter((c) => c.method === 'POST' && c.path.includes('/eval/'))).toHaveLength(0);
  });

  it('JSON Lines work too', async () => {
    const { r, dialog } = await openBulk({ [BULK]: () => Response.json({ total: 1, valid: 1, created: 1, invalid: [] }) });
    paste(dialog, '{"input":{"word":"deploy","meaning_vi":"x"},"note":"n"}');
    await userEvent.click(await within(dialog).findByRole('button', { name: count(t.submit, 1) }));
    await screen.findByText(count(t.added, 1));
    expect(bodyOf(r.calls).rows).toEqual([{ input: { word: 'deploy', meaning_vi: 'x' }, note: 'n' }]);
  });

  it('no room left: the API refusal is shown as room and rows sent, the dialog stays with its text', async () => {
    const { dialog } = await openBulk({
      [BULK]: () => problem(400, 'validation-failed', { violations: ['operation: room for 2 more examples, 5 valid rows sent'] }),
    });
    paste(dialog, 'word,meaning_vi\na,b');
    await userEvent.click(await within(dialog).findByRole('button', { name: count(t.submit, 1) }));
    expect(await within(dialog).findByText(t.noRoom.replace('{room}', '2').replace('{sent}', '5'))).toBeInTheDocument();
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toContain('a,b');
  });

  it('nhóm B M1: the hint names the expected column with an example, and the split column', async () => {
    const { dialog } = await openBulk();
    expect(dialog).toHaveTextContent('expected (JSON, ví dụ {"forms": ["deploy"]})');
    expect(dialog).toHaveTextContent('cột split (dev hoặc held_out)');
    expect(within(dialog).getByRole('textbox')).toHaveAttribute('placeholder', 'word,part_of_speech,level,meaning_vi,context_label,expected,split,note');
  });

  it('nhóm B M1: the rows are sent with their expected answer and split; a row without them is sent as before', async () => {
    const { r, dialog } = await openBulk({ [BULK]: () => Response.json({ total: 3, valid: 3, created: 3, invalid: [] }) });
    paste(dialog, 'word,expected,split\ndeploy,"{""forms"":[""deploy"",""deployed""]}",held_out\nrun,"{""forms"":[""run""]}",\ngo,,');
    await userEvent.click(await within(dialog).findByRole('button', { name: count(t.submit, 3) }));
    await screen.findByText(count(t.added, 3));
    expect(bodyOf(r.calls).rows).toEqual([
      { input: { word: 'deploy' }, note: null, expected: { forms: ['deploy', 'deployed'] }, split: 'held_out' },
      { input: { word: 'run' }, note: null, expected: { forms: ['run'] } },
      { input: { word: 'go' }, note: null, expected: null },
    ]);
  });

  it('nhóm B M1: a plain-text expected cell is not refused here; the API names that line ("expected: must be an object") and the others go in', async () => {
    const { dialog } = await openBulk({
      [BULK]: () => Response.json({ total: 2, valid: 1, created: 1, invalid: [{ row: 2, violations: ['expected: must be an object'] }] }),
    });
    paste(dialog, 'word,expected\ndeploy,"{""forms"":[""deploy""]}"\nrun,"run, ran"');
    expect(await within(dialog).findByText(count(t.readable, 2))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: count(t.submit, 2) }));
    expect(await screen.findByText(count(t.added, 1))).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([`${t.line.replace('{line}', '3')}expected: must be an object`]);
  });

  it('nhóm B M1: JSON Lines with expected and split', async () => {
    const { r, dialog } = await openBulk({ [BULK]: () => Response.json({ total: 1, valid: 1, created: 1, invalid: [] }) });
    paste(dialog, '{"word":"run","expected":{"forms":["run"]},"split":"dev"}');
    await userEvent.click(await within(dialog).findByRole('button', { name: count(t.submit, 1) }));
    await screen.findByText(count(t.added, 1));
    expect(bodyOf(r.calls).rows).toEqual([{ input: { word: 'run' }, note: null, expected: { forms: ['run'] }, split: 'dev' }]);
  });

  it('nhóm B M1: the unknown-column message lists expected and split among the valid columns', async () => {
    const { dialog } = await openBulk();
    paste(dialog, 'word,expectd\ndeploy,x');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('word, part_of_speech, level, meaning_vi, context_label, expected, split, note');
  });

  it('a file over 2 MB is refused before it is read', async () => {
    const { dialog } = await openBulk();
    const big = new File(['x'], 'big.csv', { type: 'text/csv' });
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
    await userEvent.upload(dialog.querySelector('input[type="file"]') as HTMLInputElement, big);
    expect(await within(dialog).findByText(t.fileTooLarge)).toBeInTheDocument();
    expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });
});
