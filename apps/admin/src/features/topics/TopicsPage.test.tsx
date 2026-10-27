import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

// These pages mount the whole app (session, shell, several queries): the first render can pass 1 s on a busy machine.
configure({ asyncUtilTimeout: 4000 });

const tp = vi.topics;
const LIST = 'GET /v1/admin/taxonomy/topics';
const topics = [
  { code: 'food', names: { vi: 'Ăn uống', en: 'Food' }, archived_at: null },
  { code: 'sports-old', names: { vi: 'Thể thao (cũ)' }, archived_at: '2026-10-01T00:00:00.000Z' },
];
const rowOf = async (text: string) => (await screen.findAllByText(text))[0].closest('tr, [data-testid="card"]') as HTMLElement;

describe('TopicsPage (A/89)', () => {
  it('the whole list without paging: code, names, status; no delete', async () => {
    renderApp('/topics', { [LIST]: () => Response.json({ items: topics }) });
    const food = await rowOf('Ăn uống');
    expect(within(food).getByText(tp.active)).toBeInTheDocument();
    expect(within(await rowOf('Thể thao (cũ)')).getByText(tp.archived)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /xóa/i })).toBeNull();
    expect(screen.queryByRole('button', { name: vi.common.loadMore })).toBeNull();
    expect(screen.getByText('2 chủ đề')).toBeInTheDocument();
  });

  it('add: the code must be [a-z0-9-]+; topic-exists shows on the code field; success posts code and names', async () => {
    let body: unknown;
    let first = true;
    renderApp('/topics', {
      [LIST]: () => Response.json({ items: topics }),
      'POST /v1/admin/taxonomy/topics': (call: Call) => {
        body = call.body;
        if (first) {
          first = false;
          return problem(409, 'topic-exists');
        }
        return Response.json({ code: 'travel', names: { vi: 'Du lịch' }, archived_at: null }, { status: 201 });
      },
    });
    await rowOf('Ăn uống');
    await userEvent.click(screen.getByRole('button', { name: tp.addTitle }));
    const dialog = await screen.findByRole('dialog', { name: tp.addTitle });
    await userEvent.type(within(dialog).getByLabelText(tp.code), 'Du_Lich');
    await userEvent.click(within(dialog).getByRole('button', { name: tp.add }));
    expect(within(dialog).getByText(tp.codeRule)).toBeInTheDocument();
    expect(body).toBeUndefined();
    await userEvent.clear(within(dialog).getByLabelText(tp.code));
    await userEvent.type(within(dialog).getByLabelText(tp.code), 'travel');
    await userEvent.type(within(dialog).getByLabelText(tp.nameVi), 'Du lịch');
    await userEvent.click(within(dialog).getByRole('button', { name: tp.add }));
    expect(await within(dialog).findByText(tp.exists)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: tp.add }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(body).toEqual({ code: 'travel', names: { vi: 'Du lịch' } });
    expect(await screen.findByText('Đã thêm chủ đề “travel”')).toBeInTheDocument();
  });

  it('rename sends names; archive and use again send archived', async () => {
    const sent: unknown[] = [];
    renderApp('/topics', {
      [LIST]: () => Response.json({ items: topics }),
      'PATCH /v1/admin/taxonomy/topics/food': (call: Call) => (sent.push(call.body), Response.json({ ...topics[0], archived_at: (call.body as { archived?: boolean }).archived ? 'x' : null })),
      'PATCH /v1/admin/taxonomy/topics/sports-old': (call: Call) => (sent.push(call.body), Response.json({ ...topics[1], archived_at: null })),
    });
    await rowOf('Ăn uống');
    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa tên food' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText(tp.code)).toBeNull();
    await userEvent.clear(within(dialog).getByLabelText(tp.nameEn));
    await userEvent.type(within(dialog).getByLabelText(tp.nameEn), 'Food and drink');
    await userEvent.click(within(dialog).getByRole('button', { name: tp.save }));
    await waitFor(() => expect(sent[0]).toEqual({ names: { vi: 'Ăn uống', en: 'Food and drink' } }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Lưu trữ food' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Dùng lại sports-old' })[0]);
    await waitFor(() => expect(sent.slice(1)).toEqual([{ archived: true }, { archived: false }]));
  });
});
