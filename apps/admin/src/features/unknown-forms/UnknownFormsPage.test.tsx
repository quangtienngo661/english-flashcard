import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.unknownForms;
const LIST = 'GET /v1/admin/practice/unknown-forms?page_size=20';
const LIST_PATH = '/v1/admin/practice/unknown-forms?page_size=20';
const withToken = (token: string) => `${LIST_PATH}&page_token=${token}`;
const json = (body: unknown) => () => Response.json(body);
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit'] });
const NO_ACCESS = makeMe({ staff_role: 'editor', permissions: ['entitlements.grant'] });
const row = (over: Record<string, unknown> = {}) => ({
  id: 'f-1', lemma_key: 'go', form: 'went', rejected_count: 3, first_seen_at: '2026-10-10T08:00:00.000Z', last_seen_at: '2026-10-20T09:30:00.000Z', ...over,
});
const page = (items: unknown[], next: string | null = null) => ({ items, next_page_token: next });
const rowOf = async (text: string) => (await screen.findAllByText(text))[0]!.closest('tr, [data-testid="card"]') as HTMLElement;
const acceptName = t.acceptFor.replace('{form}', 'went').replace('{lemma}', 'go');
const ignoreName = t.ignoreFor.replace('{form}', 'went').replace('{lemma}', 'go');
const press = (name: string) => userEvent.click(screen.getAllByRole('button', { name })[0]!);
const problem409 = () =>
  new Response(JSON.stringify({ type: 'http://localhost:3000/problems/word-form-exists', status: 409, title: 'Word form exists', operation_id: 'op' }), {
    status: 409,
    headers: { 'content-type': 'application/problem+json' },
  });

describe('unknown word forms', { timeout: 20_000 }, () => {
  it('§6.9: the column Từ gốc shows lemma_key, next to the form and the rejected count', async () => {
    renderApp('/unknown-forms', { [LIST]: json(page([row()])) }, EDITOR);
    const r = await rowOf('went');
    expect(within(r).getByText('go')).toBeInTheDocument();
    expect(within(r).getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText(t.cols.lemma).length).toBeGreaterThan(0);
  });

  it('§6.9: an empty page with a next_page_token fetches on and shows the rows of the next page', async () => {
    const r = renderApp('/unknown-forms', {
      [LIST]: json(page([], 'p2')),
      [`GET ${withToken('p2')}`]: json(page([row({ id: 'f-9', form: 'gone' })])),
    }, EDITOR);
    expect((await screen.findAllByText('gone')).length).toBeGreaterThan(0);
    expect(r.count('GET', withToken('p2'))).toBe(1);
    expect(screen.queryByText(t.empty)).toBeNull();
  });

  it('§6.9: empty pages with a next_page_token are fetched at most 5 pages in a row, then the empty state A/77b shows', async () => {
    const r = renderApp('/unknown-forms', {
      [LIST]: json(page([], 'p2')),
      [`GET ${withToken('p2')}`]: json(page([], 'p3')),
      [`GET ${withToken('p3')}`]: json(page([], 'p4')),
      [`GET ${withToken('p4')}`]: json(page([], 'p5')),
      [`GET ${withToken('p5')}`]: json(page([], 'p6')),
      [`GET ${withToken('p6')}`]: json(page([row()])),
    }, EDITOR);
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    expect(screen.getByText(t.emptyHint)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/practice/unknown-forms'))).toHaveLength(5);
    expect(r.count('GET', withToken('p6'))).toBe(0);
  });

  it('§6.9: [Nhận dạng này] posts lemma_key and the form with an Idempotency-Key, then a toast offers [Hoàn tác]', async () => {
    let accepted = false;
    const r = renderApp('/unknown-forms', {
      [LIST]: () => Response.json(page(accepted ? [] : [row()])),
      'POST /v1/admin/content/word-forms': () => {
        accepted = true;
        return Response.json({ id: 'wf-1', lemma_key: 'go', form: 'went' }, { status: 201 });
      },
    }, EDITOR);
    await rowOf('went');
    await press(acceptName);
    expect(await screen.findByText('Đã thêm “went” vào dạng chia của “go”.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.undo })).toBeInTheDocument();
    const post = r.calls.find((c) => c.method === 'POST' && c.path === '/v1/admin/content/word-forms')!;
    expect(post.body).toEqual({ lemma: 'go', form: 'went' });
    expect(post.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(screen.getByText(t.empty)).toBeInTheDocument());
  });

  it('§6.9: [Hoàn tác] sends the DELETE for the new form and the row comes back', async () => {
    let accepted = false;
    const r = renderApp('/unknown-forms', {
      [LIST]: () => Response.json(page(accepted ? [] : [row()])),
      'POST /v1/admin/content/word-forms': () => {
        accepted = true;
        return Response.json({ id: 'wf-1', lemma_key: 'go', form: 'went' }, { status: 201 });
      },
      'DELETE /v1/admin/content/word-forms/wf-1': () => {
        accepted = false;
        return new Response(null, { status: 204 });
      },
    }, EDITOR);
    await rowOf('went');
    await press(acceptName);
    await userEvent.click(await screen.findByRole('button', { name: t.undo }));
    await waitFor(() => expect(r.count('DELETE', '/v1/admin/content/word-forms/wf-1')).toBe(1));
    expect((await screen.findAllByText('went')).length).toBeGreaterThan(0);
    expect(screen.queryByText(t.empty)).toBeNull();
  });

  it('§6.9: word-form-exists says "Dạng này đã có." and the row is gone after the reload', async () => {
    let known = false;
    renderApp('/unknown-forms', {
      [LIST]: () => Response.json(page(known ? [] : [row()])),
      'POST /v1/admin/content/word-forms': () => {
        known = true;
        return problem409();
      },
    }, EDITOR);
    await rowOf('went');
    await press(acceptName);
    await waitFor(() => expect(screen.queryAllByText('went')).toHaveLength(0));
    expect(await screen.findByText(vi.errors['word-form-exists'])).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByText(vi.errors['word-form-exists'])).toBeInTheDocument();
  });

  it('§6.9: a failed [Hoàn tác] shows the error instead of staying silent', async () => {
    renderApp('/unknown-forms', {
      [LIST]: json(page([row()])),
      'POST /v1/admin/content/word-forms': () => Response.json({ id: 'wf-1', lemma_key: 'go', form: 'went' }, { status: 201 }),
      'DELETE /v1/admin/content/word-forms/wf-1': () =>
        new Response(JSON.stringify({ type: 'http://localhost:3000/problems/not-found', status: 404, title: 'Not found', operation_id: 'op' }), {
          status: 404,
          headers: { 'content-type': 'application/problem+json' },
        }),
    }, EDITOR);
    await rowOf('went');
    await press(acceptName);
    await userEvent.click(await screen.findByRole('button', { name: t.undo }));
    expect(await screen.findByText(vi.errors['not-found'])).toBeInTheDocument();
  });

  it('§6.9: [Bỏ qua] sends DELETE on the practice row and removes it', async () => {
    let gone = false;
    const r = renderApp('/unknown-forms', {
      [LIST]: () => Response.json(page(gone ? [] : [row()])),
      'DELETE /v1/admin/practice/unknown-forms/f-1': () => {
        gone = true;
        return new Response(null, { status: 204 });
      },
    }, EDITOR);
    await rowOf('went');
    await press(ignoreName);
    await waitFor(() => expect(r.count('DELETE', '/v1/admin/practice/unknown-forms/f-1')).toBe(1));
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('a user without content.edit sees the no-access view and the API is not called', async () => {
    const r = renderApp('/unknown-forms', { 'GET /v1/admin/content/uploads?page_size=20': json(page([])) }, NO_ACCESS);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/practice/unknown-forms'))).toBe(false);
  });
});
