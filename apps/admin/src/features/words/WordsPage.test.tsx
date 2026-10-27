import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { entriesQuery } from './words-api';

const w = vi.words;
const BATCH = '0b6f8a52-1d1e-4c8a-9a51-3a4cc1f2a001';
const entry = (over: Record<string, unknown> = {}) => ({
  id: 'e1', lemma: 'deploy', pos: 'verb', function_word: false, function_word_derived: false, function_word_override: null,
  variants: [], displayed_level: 'B1', conflict: false,
  senses: [
    { sense_id: 's1', context_label: null, state: 'open', live_revision_id: 'r1', replaces_sense_id: null, revision: 2, status: 'draft' },
    { sense_id: 's2', context_label: null, state: 'retired', live_revision_id: null, replaces_sense_id: null, revision: 1, status: 'published' },
  ],
  ...over,
});
const page = (items: unknown[], next: string | null = null) => () => Response.json({ items, next_page_token: next });
const LIST = 'GET /v1/admin/content/entries?page_size=20';
const UPLOADS = 'GET /v1/admin/content/uploads?page_size=20';
const uploads = page([{ id: BATCH, status: 'succeeded', file_name: 'cefrj.csv', row_count: 10, created_at: '2026-10-14T02:00:00.000Z' }]);
const EDITOR = makeMe({ id: 'me-2', staff_role: 'editor', permissions: ['content.edit', 'content.import', 'content.publish'] });

describe('words-api', () => {
  it('entriesQuery sends only the set filters', () => {
    expect(entriesQuery({ q: ' go ', level: 'A1', has_sense: 'false', conflict: '', batch_id: BATCH }, 'tok')).toBe(
      `q=go&level=A1&has_sense=false&batch_id=${BATCH}&page_size=20&page_token=tok`,
    );
  });
});

describe('WordsPage (A/87)', () => {
  it('rows: word, pos, level, sense counts (retired counted), function word, variants', async () => {
    renderApp('/words', { [LIST]: page([entry({ variants: [{ id: 'v1', text: 'deploi', kind: 'spelling', accepted_as_answer: true }] })]), [UPLOADS]: uploads });
    const row = (await screen.findAllByText('deploy'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(row).getByText('B1')).toBeInTheDocument();
    expect(within(row).getByText('2 nghĩa')).toBeInTheDocument();
    expect(within(row).getByText('1 đã publish · 1 bản nháp · 1 ngừng dùng')).toBeInTheDocument();
    expect(within(row).getByText('deploi')).toBeInTheDocument();
    expect(screen.getByText(w.filters.hasSenseHint)).toBeInTheDocument();
  });

  it('filters live in the URL and reach the API; batch options come from the uploads list', async () => {
    const want = `GET /v1/admin/content/entries?q=go&level=A1&has_sense=false&conflict=true&batch_id=${BATCH}&page_size=20`;
    const r = renderApp(`/words?q=go&level=A1&has_sense=false&conflict=true&batch_id=${BATCH}`, { [want]: page([entry()]), [UPLOADS]: uploads });
    await screen.findAllByText('deploy');
    expect(r.count('GET', want.slice(4))).toBe(1);
    expect(screen.getByLabelText(w.filters.conflict)).toBeChecked();
    expect(screen.getByRole('button', { name: new RegExp(w.filters.batch) })).toHaveTextContent('cefrj.csv');
  });

  it('a hand-edited URL drops invalid filter values instead of sending them', async () => {
    const r = renderApp('/words?level=Z9&has_sense=maybe&batch_id=nope', { [LIST]: page([entry()]), [UPLOADS]: uploads });
    await screen.findAllByText('deploy');
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/content/entries')).map((c) => c.path)).toEqual(['/v1/admin/content/entries?page_size=20']);
  });

  it('Sửa trình độ: PUT editorial level, then the list reloads', async () => {
    let body: unknown;
    const r = renderApp('/words', {
      [LIST]: page([entry()]), [UPLOADS]: uploads,
      'PUT /v1/admin/content/entries/e1/levels/editorial': (call: Call) => {
        body = call.body;
        return new Response(null, { status: 204 });
      },
    });
    await screen.findAllByText('deploy');
    await userEvent.click(screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'deploy · verb') })[0]);
    await userEvent.click(await screen.findByRole('menuitem', { name: w.editLevel }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: new RegExp(w.level) }));
    await userEvent.click(await screen.findByRole('option', { name: 'C1' }));
    await userEvent.click(within(dialog).getByRole('button', { name: w.save }));
    await waitFor(() => expect(body).toEqual({ level: 'C1' }));
    await waitFor(() => expect(r.count('GET', '/v1/admin/content/entries?page_size=20')).toBe(2));
  });

  it('Sửa cách viết khác sends the whole set; Từ chức năng sends true/false/null and needs taxonomy.manage', async () => {
    const sent: Record<string, unknown> = {};
    renderApp('/words', {
      [LIST]: page([entry({ variants: [{ id: 'v1', text: 'deploi', kind: 'spelling', accepted_as_answer: true }] })]), [UPLOADS]: uploads,
      'PUT /v1/admin/content/entries/e1/variants': (call: Call) => ((sent.variants = call.body), new Response(null, { status: 204 })),
      'PUT /v1/admin/taxonomy/entries/e1/function-word': (call: Call) => ((sent.fw = call.body), new Response(null, { status: 204 })),
    });
    await screen.findAllByText('deploy');
    const open = async (item: string) => {
      await userEvent.click(screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'deploy · verb') })[0]);
      await userEvent.click(await screen.findByRole('menuitem', { name: item }));
      return screen.findByRole('dialog');
    };
    let dialog = await open(w.editVariants);
    await userEvent.click(within(dialog).getByRole('button', { name: w.addVariant }));
    await userEvent.type(within(dialog).getAllByLabelText(w.variantText)[1], 'deploye');
    await userEvent.click(within(dialog).getByRole('button', { name: w.save }));
    await waitFor(() => expect(sent.variants).toEqual({ variants: [
      { text: 'deploi', kind: 'spelling', accepted_as_answer: true },
      { text: 'deploye', kind: 'spelling', accepted_as_answer: true },
    ] }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    dialog = await open(w.editFunctionWord);
    await userEvent.click(within(dialog).getByRole('radio', { name: w.yes }));
    await userEvent.click(within(dialog).getByRole('button', { name: w.save }));
    await waitFor(() => expect(sent.fw).toEqual({ override: true }));
  });

  it('without taxonomy.manage the function-word action is not offered', async () => {
    renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads }, EDITOR);
    await screen.findAllByText('deploy');
    await userEvent.click(screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'deploy · verb') })[0]);
    expect(await screen.findByRole('menuitem', { name: w.editLevel })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: w.editFunctionWord })).toBeNull();
  });

  it('Thêm nghĩa creates a sense and opens it', async () => {
    renderApp('/words', {
      [LIST]: page([entry()]), [UPLOADS]: uploads,
      'POST /v1/admin/content/senses': () => Response.json({ sense_id: 's9', revision_id: 'r9', revision: 1 }, { status: 201 }),
      'GET /v1/admin/content/senses/s9': () => new Response(null, { status: 404 }),
    });
    await screen.findAllByText('deploy');
    await userEvent.click(screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'deploy · verb') })[0]);
    await userEvent.click(await screen.findByRole('menuitem', { name: w.addSense }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.senses));
  });

  it('paste: more than 500 lines is refused on the client; the result lists each line with "Soạn nghĩa"', async () => {
    let lines: unknown;
    renderApp('/words', {
      [LIST]: page([]), [UPLOADS]: uploads,
      'POST /v1/admin/content/entries/batch': (call: Call) => {
        lines = call.body;
        return Response.json({ items: [
          { line: 1, status: 'created', entry_id: 'e5', sense_id: 's5', warnings: [] },
          { line: 2, status: 'exists', entry_id: 'e1', sense_id: 's1', warnings: [] },
          { line: 3, status: 'invalid', warnings: ['Expected lemma,pos'] },
        ] });
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: w.pasteButton }));
    const dialog = await screen.findByRole('dialog', { name: w.paste.title });
    const area = within(dialog).getByLabelText(w.paste.label);
    await userEvent.click(area);
    await userEvent.paste(Array.from({ length: 501 }, (_, i) => `w${i},noun`).join('\n'));
    expect(within(dialog).getByText('Có 501 dòng, tối đa 500. Bớt dòng rồi thử lại.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: w.paste.submit })).toBeDisabled();
    await userEvent.clear(area);
    await userEvent.paste('rizz,noun\ndeploy,verb\n\nbad');
    await userEvent.click(within(dialog).getByRole('button', { name: w.paste.submit }));
    expect(await within(dialog).findByText('Đã tạo 1 · đã có 1 · sai 1')).toBeInTheDocument();
    expect(lines).toEqual({ lines: ['rizz,noun', 'deploy,verb', 'bad'] });
    const links = within(dialog).getAllByRole('link', { name: w.paste.writeSense });
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/senses/s5', '/senses/s1']);
    expect(within(dialog).getByText(w.paste.invalid)).toBeInTheDocument();
  });
});
