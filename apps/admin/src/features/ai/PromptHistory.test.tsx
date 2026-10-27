import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { renderApp } from '../staff/test-utils';
import { SYSTEM, URL, promptRoutes, promptView, revision } from './prompt-test-support';

const t = vi.ai.prompts.history;
const historyList = () => screen.getByRole('list', { name: t.title });

beforeEach(() => sessionStorage.clear());

describe('Prompt history (A/82)', () => {
  it('lists revision, saved time and who saved (email, or "Hệ thống" for the seed) with the "Muốn quay về bản cũ" note', async () => {
    renderApp('/ai/prompts', promptRoutes({
      [URL.revisions()]: () => Response.json({ items: [revision(3), revision(2), revision(1, { saved_by: 'sys', saved_by_user: SYSTEM })], next_page_token: null }),
    }));
    const items = within(await screen.findByRole('list', { name: t.title })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(t.revision.replace('{revision}', '3'));
    expect(items[0]).toHaveTextContent('15/10/2026 09:12');
    expect(items[0]).toHaveTextContent('lan@wordmet.com');
    expect(items[2]).toHaveTextContent(vi.common.system);
    expect(screen.getByText(t.note)).toBeInTheDocument();
  });

  it('[Xem] opens the revision read-only; [Chép vào ô sửa] puts it in the editor without changing expected_revision', async () => {
    const r = renderApp('/ai/prompts', promptRoutes({
      [URL.revisions()]: () => Response.json({ items: [revision(3), revision(2)], next_page_token: null }),
      [URL.save()]: (call) => Response.json(promptView({ ...(call.body as object), revision: 4 })),
    }));
    await screen.findByRole('list', { name: t.title });
    await userEvent.click(screen.getByRole('button', { name: t.viewFor.replace('{revision}', '2') }));
    const dialog = await screen.findByRole('dialog', { name: t.viewTitle.replace('{revision}', '2') });
    expect(within(dialog).getByText('Text of revision 2.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.ai.prompts.copyToEditor }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText(vi.ai.prompts.instructions)).toHaveValue('Text of revision 2.');
    await userEvent.click(screen.getByRole('button', { name: vi.ai.prompts.save }));
    await screen.findByText(vi.ai.prompts.saved.replace('{revision}', '4'));
    const put = r.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toMatchObject({ expected_revision: 3, instructions: 'Text of revision 2.' });
  });

  it('"Tải thêm" reads the next page', async () => {
    renderApp('/ai/prompts', promptRoutes({
      [URL.revisions()]: () => Response.json({ items: [revision(3)], next_page_token: 'p2' }),
      [`${URL.revisions()}&page_token=p2`]: () => Response.json({ items: [revision(2)], next_page_token: null }),
    }));
    await screen.findByRole('list', { name: t.title });
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    await waitFor(() => expect(within(historyList()).getAllByRole('listitem')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: vi.common.loadMore })).not.toBeInTheDocument();
  });
});
