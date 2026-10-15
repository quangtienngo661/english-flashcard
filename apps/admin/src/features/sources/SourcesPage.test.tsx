import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.sources;
const SRC = { id: 's1', kind: 'third_party', name: 'CEFR-J Vocabulary Profile', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 };
const LIST = 'GET /v1/admin/content/sources';
const CREATE = 'POST /v1/admin/content/sources';
const creates = (calls: { method: string; path: string; body: unknown }[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/content/sources');

describe('sources list', () => {
  it('renders each source with version, license and priority', async () => {
    renderApp('/sources', { [LIST]: () => Response.json({ items: [SRC] }) });
    expect((await screen.findAllByText('CEFR-J Vocabulary Profile')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('CC BY 4.0').length).toBeGreaterThan(0);
  });

  it('empty: says so and offers the first registration', async () => {
    renderApp('/sources', { [LIST]: () => Response.json({ items: [] }) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });
});

describe('source form', () => {
  async function openForm(post: () => Response = () => Response.json(SRC, { status: 201 })) {
    const r = renderApp('/sources', { [LIST]: () => Response.json({ items: [] }), [CREATE]: post });
    await userEvent.click((await screen.findAllByRole('button', { name: t.register }))[0]);
    return r;
  }

  it('sources form: version and license are marked required while "dùng làm nguồn level" is ticked, and not when unticked', async () => {
    await openForm();
    const box = await screen.findByRole('checkbox', { name: t.form.asLevelSource });
    expect(box).toBeChecked();
    expect(screen.getByLabelText(`${t.form.version} *`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${t.form.license} *`)).toBeInTheDocument();
    await userEvent.click(box);
    expect(screen.getByLabelText(t.form.version)).toBeInTheDocument();
    expect(screen.getByLabelText(t.form.license)).toBeInTheDocument();
  });

  it('ticked with an empty version or license: refused in the form, nothing sent', async () => {
    const r = await openForm();
    await userEvent.type(await screen.findByLabelText(`${t.form.name} *`), 'CEFR-J');
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findAllByText(t.form.required)).toHaveLength(2);
    expect(creates(r.calls)).toHaveLength(0);
  });

  it('a valid form posts the body and returns to the refreshed list', async () => {
    const r = await openForm();
    await userEvent.type(await screen.findByLabelText(`${t.form.name} *`), 'CEFR-J');
    await userEvent.type(screen.getByLabelText(`${t.form.version} *`), '1.5');
    await userEvent.type(screen.getByLabelText(`${t.form.license} *`), 'CC BY 4.0');
    await userEvent.type(screen.getByLabelText(t.form.url), 'https://www.cefr-j.org');
    await userEvent.clear(screen.getByLabelText(t.form.priority));
    await userEvent.type(screen.getByLabelText(t.form.priority), '10');
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(creates(r.calls)).toHaveLength(1));
    expect(creates(r.calls)[0].body).toEqual({
      name: 'CEFR-J',
      version: '1.5',
      url: 'https://www.cefr-j.org',
      license: 'CC BY 4.0',
      attribution: '',
      display_priority: 10,
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: t.form.save })).toBeNull());
  }, 20_000);

  it('source-exists is shown in the form', async () => {
    await openForm(() => problem(409, 'source-exists'));
    await userEvent.type(await screen.findByLabelText(`${t.form.name} *`), 'CEFR-J');
    await userEvent.click(screen.getByRole('checkbox', { name: t.form.asLevelSource }));
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText(vi.errors['source-exists'])).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByLabelText(t.form.name + ' *')).toHaveValue('CEFR-J');
  });
});
