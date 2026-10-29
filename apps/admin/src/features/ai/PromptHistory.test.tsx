import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { renderApp } from '../staff/test-utils';
import { URL, configRoutes, configsView, draftView } from './configs/config-test-support';
import { SYSTEM, revision } from './prompt-test-support';

const t = vi.ai.prompts.history;
const title = vi.ai.configs.oldPrompts;
const withDraft = () => Response.json(configsView({ draft: draftView() }));

beforeEach(() => sessionStorage.clear());

// The history of the prompt revisions saved before configs existed; it sits at the foot of the "Cấu hình" page.
describe('Prompt history on the configs page', () => {
  it('lists revision, saved time and who saved (email, or "Hệ thống" for the seed) with its own note', async () => {
    renderApp('/ai/configs', configRoutes({
      [URL.revisions()]: () => Response.json({ items: [revision(3), revision(2), revision(1, { saved_by: 'sys', saved_by_user: SYSTEM })], next_page_token: null }),
    }));
    const items = within(await screen.findByRole('list', { name: title }, { timeout: 4000 })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(t.revision.replace('{revision}', '3'));
    expect(items[0]).toHaveTextContent('15/10/2026 09:12');
    expect(items[0]).toHaveTextContent('lan@wordmet.com');
    expect(items[2]).toHaveTextContent(vi.common.system);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(vi.ai.configs.oldPromptsNote)).toBeInTheDocument();
  });

  it('[Xem] opens the revision read-only; with a draft [Chép vào ô sửa] puts it in the draft form and the next save keeps the draft version', async () => {
    const r = renderApp('/ai/configs', configRoutes({
      [URL.configs()]: withDraft,
      [URL.revisions()]: () => Response.json({ items: [revision(3), revision(2)], next_page_token: null }),
      [URL.saveDraft()]: (call) => Response.json(draftView({ ...(call.body as object), version: 1 } as never)),
    }));
    await userEvent.click(await screen.findByRole('button', { name: t.viewFor.replace('{revision}', '2') }, { timeout: 4000 }));
    const dialog = await screen.findByRole('dialog', { name: t.viewTitle.replace('{revision}', '2') });
    expect(within(dialog).getByText('Text of revision 2.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.ai.prompts.copyToEditor }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText(vi.ai.prompts.instructions)).toHaveValue('Text of revision 2.');
    await userEvent.click(screen.getByRole('button', { name: vi.ai.configs.draft.save }));
    await screen.findByText(vi.ai.configs.draft.saved.replace('{version}', '1'));
    const put = r.calls.find((c) => c.method === 'PUT');
    expect(put?.body).toMatchObject({ expected_version: 0, instructions: 'Text of revision 2.' });
  });

  it('"Tải thêm" reads the next page', async () => {
    renderApp('/ai/configs', configRoutes({
      [URL.revisions()]: () => Response.json({ items: [revision(3)], next_page_token: 'p2' }),
      [`${URL.revisions()}&page_token=p2`]: () => Response.json({ items: [revision(2)], next_page_token: null }),
    }));
    await screen.findByRole('list', { name: title }, { timeout: 4000 });
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: title })).getAllByRole('listitem')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: vi.common.loadMore })).not.toBeInTheDocument();
  });
});
