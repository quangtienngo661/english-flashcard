import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.uploads;
const SOURCES = {
  items: [
    { id: 's1', kind: 'third_party', name: 'CEFR-J Vocabulary Profile', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 },
    { id: 's2', kind: 'third_party', name: 'Octanove', version: '1.0', url: null, license: 'CC0', attribution: '', display_priority: 20 },
  ],
};
const UPLOADS = 'POST /v1/admin/content/uploads';
// The form opens as a dialog over its list (UB9): every render also answers the list.
const LIST = 'GET /v1/admin/content/uploads?page_size=20';
const list = () => Response.json({ items: [{ id: 'b1', status: 'succeeded', file_name: 'listed.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null });
const plainCsv = (name = 'plain.csv', type = 'text/csv') => new File(['pos,headword\nnoun,cat\n'], name, { type });
const levelCsv = (name = 'level.csv') => new File(['pos,headword,CEFR\nnoun,cat,A1\n'], name, { type: 'text/csv' });

const retryAfter = (seconds: number, slug: string) =>
  new Response(JSON.stringify({ type: slug === '' ? 'about:blank' : `http://api.test/problems/${slug}`, status: 409, title: 'x' }), {
    status: 409,
    headers: { 'content-type': 'application/problem+json', 'retry-after': String(seconds) },
  });

function open(post: (n: number) => Response) {
  let n = 0;
  const r = renderApp('/uploads/new', {
    [LIST]: list,
    'GET /v1/admin/content/sources': () => Response.json(SOURCES),
    [UPLOADS]: () => post(++n),
  });
  const posts = () => r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/content/uploads');
  const key = (i: number) => (posts()[i].headers as Record<string, string>)['Idempotency-Key'];
  return { ...r, posts, key };
}

async function pick(file: File) {
  const input = await waitFor(() => {
    const el = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!el) throw new Error('no file input yet');
    return el;
  });
  await userEvent.setup({ applyAccept: false }).upload(input, file);
}

const upload = () => screen.findByRole('button', { name: t.submit });

describe('upload dialog', () => {
  it('UBC13 "Upload CSV" opens a dialog over the list at /uploads/new; "Hủy" returns to /uploads', async () => {
    renderApp('/uploads', { [LIST]: list, 'GET /v1/admin/content/sources': () => Response.json(SOURCES) });
    await userEvent.click(await screen.findByRole('button', { name: t.upload }));
    const dialog = await screen.findByRole('dialog', { name: t.formTitle });
    expect(document.querySelector('table')).not.toBeNull(); // the list stays under the dialog
    expect(screen.getByRole('heading', { level: 1, hidden: true })).toHaveTextContent(vi.nav.uploads);
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: t.upload })).toBeInTheDocument();
  });

  it('UBE32 a user with content.import but not content.edit opening /uploads/new sees the dialog as today, and no "Upload CSV" button', async () => {
    renderApp('/uploads/new', { [LIST]: list, 'GET /v1/admin/content/sources': () => Response.json(SOURCES) }, makeMe({ permissions: ['content.import'] }));
    expect(await screen.findByRole('dialog', { name: t.formTitle })).toBeInTheDocument();
    expect(within(document.querySelector<HTMLElement>('main header')!).queryByText(t.upload)).toBeNull();
  });
});

describe('upload form', () => {
  it('B25#11: a fresh Idempotency-Key per submit; a network error then "Thử lại" resends the same key; another file makes a new key', async () => {
    const r = open((n) => {
      if (n <= 2) throw new TypeError('Failed to fetch');
      return Response.json({ batch_id: 'b9', status: 'queued' }, { status: 202 });
    });
    await pick(plainCsv());
    await userEvent.click(await upload());
    await userEvent.click(await screen.findByRole('button', { name: vi.common.retry }));
    await waitFor(() => expect(r.posts()).toHaveLength(2));
    expect(r.key(0)).toBeTruthy();
    expect(r.key(1)).toBe(r.key(0));

    await pick(plainCsv('other.csv'));
    await userEvent.click(await upload());
    await waitFor(() => expect(r.posts()).toHaveLength(3));
    expect(r.key(2)).not.toBe(r.key(0));
    await waitFor(() => expect(screen.queryByRole('button', { name: t.submit })).toBeNull()); // left the form for the batch page
  });

  it('B25#11: choosing another level source makes a new key', async () => {
    const r = open(() => {
      throw new TypeError('Failed to fetch');
    });
    await pick(levelCsv());
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(t.levelSource) }));
    await userEvent.click(await screen.findByRole('option', { name: /CEFR-J Vocabulary Profile 1\.5/ }));
    await userEvent.click(await upload());
    await waitFor(() => expect(r.posts()).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.levelSource) }));
    await userEvent.click(await screen.findByRole('option', { name: /Octanove 1\.0/ }));
    await userEvent.click(await upload());
    await waitFor(() => expect(r.posts()).toHaveLength(2));
    expect(r.key(1)).not.toBe(r.key(0));
    expect((r.posts()[1].body as FormData).get('level_source_id')).toBe('s2');
  });

  it('409 in-progress with Retry-After 2 → the in-progress message, resent after 2 s with the same key', async () => {
    const r = open((n) => (n === 1 ? retryAfter(2, '') : Response.json({ batch_id: 'b9', status: 'queued' }, { status: 202 })));
    await pick(plainCsv());
    await userEvent.click(await upload());
    expect(await screen.findByText(vi.errors.inProgress)).toBeInTheDocument();
    expect(r.posts()).toHaveLength(1);
    await waitFor(() => expect(r.posts()).toHaveLength(2), { timeout: 5000 });
    expect(r.key(1)).toBe(r.key(0));
  });

  it('409 idempotency-key-abandoned → a message asking to submit again, and the next submit has a new key', async () => {
    const r = open((n) => (n === 1 ? problem(409, 'idempotency-key-abandoned') : Response.json({ batch_id: 'b9', status: 'queued' }, { status: 202 })));
    await pick(plainCsv());
    await userEvent.click(await upload());
    expect(await screen.findByText(vi.errors['idempotency-key-abandoned'])).toBeInTheDocument();
    await userEvent.click(await upload());
    await waitFor(() => expect(r.posts()).toHaveLength(2));
    expect(r.key(1)).not.toBe(r.key(0));
  });

  it('B25E9: a 10 MB + 1 byte file or a .txt file is blocked before any request', async () => {
    const r = open(() => Response.json({}, { status: 202 }));
    await pick(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.csv', { type: 'text/csv' }));
    expect(await screen.findByText(vi.errors['file-too-large'])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.submit })).toBeDisabled();

    await pick(new File(['pos,headword\n'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText(vi.errors['file-invalid'])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.submit })).toBeDisabled();
    expect(r.posts()).toHaveLength(0);
  });

  it.each([
    ['application/vnd.ms-excel', 'excel.csv'],
    ['', 'blank-type.csv'],
  ])('Review Focus 1: a .csv with type "%s" is accepted by its extension', async (type, name) => {
    const r = open(() => Response.json({ batch_id: 'b9', status: 'queued' }, { status: 202 }));
    await pick(plainCsv(name, type));
    await userEvent.click(await upload());
    await waitFor(() => expect(r.posts()).toHaveLength(1));
    expect(((r.posts()[0].body as FormData).get('file') as File).name).toBe(name);
  });

  it('B25E21: a header with CEFR and no level source → selection required, no request; a chosen source is sent', async () => {
    const r = open(() => Response.json({ batch_id: 'b9', status: 'queued' }, { status: 202 }));
    await pick(levelCsv());
    await userEvent.click(await upload());
    expect(await screen.findByText(t.levelSourceRequired)).toBeInTheDocument();
    expect(r.posts()).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.levelSource) }));
    await userEvent.click(await screen.findByRole('option', { name: /CEFR-J Vocabulary Profile 1\.5/ }));
    await userEvent.click(await upload());
    await waitFor(() => expect(r.posts()).toHaveLength(1));
    expect((r.posts()[0].body as FormData).get('level_source_id')).toBe('s1');
  });

  it('a file without a level column shows no level source field', async () => {
    open(() => Response.json({}, { status: 202 }));
    await pick(plainCsv());
    await upload();
    expect(screen.queryByText(new RegExp(t.levelSource))).toBeNull();
  });

  it('B25E22: source-incomplete → the message names version and license', async () => {
    open(() => problem(400, 'source-incomplete'));
    await pick(levelCsv());
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(t.levelSource) }));
    await userEvent.click(await screen.findByRole('option', { name: /CEFR-J Vocabulary Profile 1\.5/ }));
    await userEvent.click(await upload());
    const message = await screen.findByText(/phiên bản/);
    expect(message).toHaveTextContent(/license/);
  });

  it('B25#18: a 429 with Retry-After 5 disables Upload with a countdown', async () => {
    open(
      () =>
        new Response(JSON.stringify({ type: 'http://api.test/problems/rate-limited', status: 429, title: 'x' }), {
          status: 429,
          headers: { 'content-type': 'application/problem+json', 'retry-after': '5' },
        }),
    );
    await pick(plainCsv());
    await userEvent.click(await upload());
    const button = await screen.findByRole('button', { name: /5/ });
    expect(button).toBeDisabled();
    expect(within(button).queryByText(/5/)).not.toBeNull();
  });
});
