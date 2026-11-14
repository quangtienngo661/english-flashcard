import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { entriesQuery } from './words-api';

// These pages mount the whole app (session, shell, several queries): the first render can pass 1 s on a busy machine.
configure({ asyncUtilTimeout: 4000 });

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

  describe('Xóa từ (only a word that was never published and nothing uses)', () => {
    const DELETE = 'DELETE /v1/admin/content/entries/e1';
    const openMenu = async () => userEvent.click(screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'deploy · verb') })[0]);
    const askDelete = async () => {
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: w.deleteWord }));
      return screen.findByRole('dialog');
    };
    const confirm = (dialog: HTMLElement) => userEvent.click(within(dialog).getByRole('button', { name: w.deleteConfirm }));
    const deletes = (calls: Call[]) => calls.filter((c) => c.method === 'DELETE');
    const refusal = (reasons: unknown) => () => problem(409, 'entry-in-use', { reasons });
    const blocked = w.deleteBlocked as Record<string, string>;

    it('the action is the last item of the menu, for every row, with or without taxonomy.manage', async () => {
      renderApp('/words', { [LIST]: page([entry(), entry({ id: 'e2', lemma: 'run' })]), [UPLOADS]: uploads });
      await screen.findAllByText('deploy');
      await openMenu();
      expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
        w.editLevel, w.editVariants, w.editFunctionWord, w.addSense, w.deleteWord,
      ]);
      await userEvent.keyboard('{Escape}');
      await userEvent.click(screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'run · verb') })[0]);
      expect((await screen.findAllByRole('menuitem')).at(-1)).toHaveTextContent(w.deleteWord);
    });

    it('an editor without taxonomy.manage still gets it, after Thêm nghĩa', async () => {
      renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads }, EDITOR);
      await screen.findAllByText('deploy');
      await openMenu();
      expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([w.editLevel, w.editVariants, w.addSense, w.deleteWord]);
    });

    it('the menu opens with the keyboard and the action is reached with arrow keys and Enter', async () => {
      renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads });
      await screen.findAllByText('deploy');
      screen.getAllByRole('button', { name: w.actionsFor.replace('{word}', 'deploy · verb') })[0].focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(await screen.findByRole('menuitem', { name: w.deleteWord })).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(await screen.findByRole('dialog', { name: w.deleteTitle.replace('{word}', 'deploy') })).toBeInTheDocument();
    });

    it('asks first: the danger dialog says the word and its unpublished drafts go and that it cannot be undone; Hủy sends nothing', async () => {
      const r = renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      expect(dialog).toHaveAccessibleName(w.deleteTitle.replace('{word}', 'deploy'));
      expect(within(dialog).getByText(w.deleteBody)).toBeInTheDocument();
      expect(w.deleteBody).toMatch(/không hoàn tác được/i);
      expect(within(dialog).getByRole('button', { name: w.deleteConfirm }).className).toContain('bg-danger');
      await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(deletes(r.calls)).toHaveLength(0);
    });

    it('Esc closes the question without deleting', async () => {
      const r = renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads });
      await screen.findAllByText('deploy');
      await askDelete();
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(deletes(r.calls)).toHaveLength(0);
    });

    it('confirm: one DELETE for this word, the dialog closes, a toast says it, and the list reloads', async () => {
      const r = renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: () => new Response(null, { status: 204 }) });
      await screen.findAllByText('deploy');
      await confirm(await askDelete());
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(await screen.findByText(w.deleted.replace('{word}', 'deploy'))).toBeInTheDocument();
      await waitFor(() => expect(r.count('GET', '/v1/admin/content/entries?page_size=20')).toBe(2));
      expect(deletes(r.calls).map((c) => c.path)).toEqual(['/v1/admin/content/entries/e1']);
    });

    it('while the request runs the buttons are locked, so a second click sends nothing more', async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const r = renderApp('/words', {
        [LIST]: page([entry()]), [UPLOADS]: uploads,
        [DELETE]: async () => { await gate; return new Response(null, { status: 204 }); },
      });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      await confirm(dialog);
      await waitFor(() => expect(deletes(r.calls)).toHaveLength(1));
      expect(within(dialog).getByRole('button', { name: vi.common.cancel })).toBeDisabled();
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      release();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(deletes(r.calls)).toHaveLength(1);
    });

    it.each(Object.keys(blocked).filter((code) => code !== 'title'))('409 entry-in-use [%s]: the dialog stays open with the title and that sentence; the word stays; nothing reloads', async (code) => {
      const r = renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: refusal([code]) });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      await confirm(dialog);
      const alert = await within(dialog).findByRole('alert');
      expect(within(alert).getByText(w.deleteBlocked.title.replace('{word}', 'deploy'))).toBeInTheDocument();
      expect(within(alert).getAllByRole('listitem').map((item) => item.textContent)).toEqual([blocked[code]]);
      expect(screen.getAllByText('deploy').length).toBeGreaterThan(0);
      expect(r.count('GET', '/v1/admin/content/entries?page_size=20')).toBe(1);
      expect(vi.errors['entry-in-use']).toBeTruthy();
    });

    it('409 with several reasons lists one sentence each, in the order the API gave', async () => {
      renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: refusal(['published-sense', 'learner-data', 'active-job']) });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      await confirm(dialog);
      const alert = await within(dialog).findByRole('alert');
      expect(within(alert).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        blocked['published-sense'], blocked['learner-data'], blocked['active-job'],
      ]);
    });

    it.each([[[]], [['a-reason-from-a-newer-api']], [undefined]])('409 whose reasons are %j: the general "in use" sentence, never an empty list', async (reasons) => {
      renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: refusal(reasons) });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      await confirm(dialog);
      const alert = await within(dialog).findByRole('alert');
      expect(within(alert).getByText(vi.errors['entry-in-use'])).toBeInTheDocument();
      expect(within(alert).queryAllByRole('listitem')).toHaveLength(0);
    });

    it('a refusal can be read again after closing and reopening; the old message does not stay', async () => {
      renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: refusal(['learner-data']) });
      await screen.findAllByText('deploy');
      let dialog = await askDelete();
      await confirm(dialog);
      await within(dialog).findByRole('alert');
      await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      dialog = await askDelete();
      expect(within(dialog).queryByRole('alert')).toBeNull();
    });

    it('404 (someone deleted it first): the message, and the list reloads so the word is gone', async () => {
      const r = renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: () => problem(404, 'not-found') });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      await confirm(dialog);
      expect(await within(dialog).findByText(vi.errors['not-found'])).toBeInTheDocument();
      await waitFor(() => expect(r.count('GET', '/v1/admin/content/entries?page_size=20')).toBe(2));
    });

    it('any other error shows its mapped message and keeps the word', async () => {
      const r = renderApp('/words', { [LIST]: page([entry()]), [UPLOADS]: uploads, [DELETE]: () => problem(429, 'rate-limited') });
      await screen.findAllByText('deploy');
      const dialog = await askDelete();
      await confirm(dialog);
      expect(await within(dialog).findByText(vi.errors['rate-limited'])).toBeInTheDocument();
      expect(r.count('GET', '/v1/admin/content/entries?page_size=20')).toBe(1);
    });
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
