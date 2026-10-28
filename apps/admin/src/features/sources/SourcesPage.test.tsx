import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, rateLimited, type Route } from '../../auth/test-support';
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
    expect(within(screen.getByRole('dialog', { name: t.formTitle })).getByLabelText(t.form.name + ' *')).toHaveValue('CEFR-J');
  });

  it('UBC13 the form is a dialog over the list; a saved source closes it and the list shows it', async () => {
    let saved = false;
    renderApp('/sources', {
      [LIST]: () => Response.json({ items: saved ? [SRC] : [] }),
      [CREATE]: () => {
        saved = true;
        return Response.json(SRC, { status: 201 });
      },
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.register }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.formTitle });
    await userEvent.type(within(dialog).getByLabelText(`${t.form.name} *`), 'CEFR-J Vocabulary Profile');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: t.form.asLevelSource }));
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await screen.findAllByText('CEFR-J Vocabulary Profile')).length).toBeGreaterThan(0);
  }, 20_000);
});

const retryIn = (n: number) => vi.errors.retryIn.replace('{seconds}', String(n));
afterEach(() => vitest.useRealTimers());
async function tick() {
  await act(async () => {
    await vitest.advanceTimersByTimeAsync(1000);
  });
}

describe('source form — rate limit', () => {
  it('B25#18: 429 with Retry-After 30 disables save and counts 30 → 0, then re-enables', async () => {
    const r = renderApp('/sources', { [LIST]: () => Response.json({ items: [] }), [CREATE]: () => rateLimited(30) });
    await userEvent.click((await screen.findAllByRole('button', { name: t.register }))[0]);
    await userEvent.type(await screen.findByLabelText(`${t.form.name} *`), 'CEFR-J');
    await userEvent.click(screen.getByRole('checkbox', { name: t.form.asLevelSource }));
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));

    expect(await screen.findByRole('button', { name: retryIn(30) })).toBeDisabled();
    await tick();
    expect(screen.getByRole('button', { name: retryIn(29) })).toBeDisabled();
    for (let i = 0; i < 29; i++) await tick();
    expect(screen.getByRole('button', { name: t.form.save })).toBeEnabled();
    expect(creates(r.calls)).toHaveLength(1);
  }, 20_000);
});

const OWNER = { id: 'o1', kind: 'owner', name: 'owner', version: '', url: null, license: '', attribution: '', display_priority: 0 };
const PATCH = 'PATCH /v1/admin/content/sources/s1';
const DELETE = 'DELETE /v1/admin/content/sources/s1';
const named = (text: string, name: string) => text.replace('{name}', name);
const sent = (calls: { method: string; path: string; body: unknown }[], method: string) =>
  calls.filter((c) => c.method === method && c.path === '/v1/admin/content/sources/s1');
const listCalls = (calls: { method: string; path: string }[]) => calls.filter((c) => c.method === 'GET' && c.path === '/v1/admin/content/sources');

describe('source rows: edit and delete buttons', () => {
  it('a third-party row has Sửa and Xóa named after the source; the owner row has neither and says why', async () => {
    renderApp('/sources', { [LIST]: () => Response.json({ items: [OWNER, SRC] }) });
    await screen.findAllByText(SRC.name);
    expect(screen.getAllByRole('button', { name: named(t.editFor, SRC.name) }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: named(t.deleteFor, SRC.name) }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: named(t.editFor, OWNER.name) })).toBeNull();
    expect(screen.queryByRole('button', { name: named(t.deleteFor, OWNER.name) })).toBeNull();
    expect(screen.getAllByText(t.ownerNote).length).toBeGreaterThan(0);
    // One pair of buttons per third-party row (table and card), none for the owner.
    expect(screen.getAllByRole('button', { name: /^(Sửa|Xóa) nguồn / })).toHaveLength(4);
  });
});

describe('source edit dialog', () => {
  const FULL = { ...SRC, url: 'https://www.cefr-j.org', attribution: 'Tono Yukio' };

  async function openEdit(routes: Record<string, Route> = {}, source = FULL) {
    const r = renderApp('/sources', { [LIST]: () => Response.json({ items: [OWNER, source] }), ...routes });
    await screen.findAllByText(source.name);
    await userEvent.click(screen.getAllByRole('button', { name: named(t.editFor, source.name) })[0]);
    const dialog = await screen.findByRole('dialog', { name: named(t.editTitle, source.name) });
    return { r, dialog };
  }
  const field = (dialog: HTMLElement, label: string) => within(dialog).getByLabelText(label);
  const save = (dialog: HTMLElement) => userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));

  it('opens prefilled with the source, the level checkbox ticked because version and license are there', async () => {
    const { dialog } = await openEdit();
    expect(field(dialog, `${t.form.name} *`)).toHaveValue(FULL.name);
    expect(field(dialog, `${t.form.version} *`)).toHaveValue('1.5');
    expect(field(dialog, t.form.url)).toHaveValue('https://www.cefr-j.org');
    expect(field(dialog, `${t.form.license} *`)).toHaveValue('CC BY 4.0');
    expect(field(dialog, t.form.attribution)).toHaveValue('Tono Yukio');
    expect(field(dialog, t.form.priority)).toHaveValue('10');
    expect(within(dialog).getByRole('checkbox', { name: t.form.asLevelSource })).toBeChecked();
  });

  it('a source without version or license opens with the level checkbox unticked', async () => {
    const { dialog } = await openEdit({}, { ...FULL, version: '', license: '' });
    expect(within(dialog).getByRole('checkbox', { name: t.form.asLevelSource })).not.toBeChecked();
    expect(field(dialog, t.form.version)).toHaveValue('');
  });

  it('sends only the keys that changed (trimmed), then closes and toasts', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => Response.json({ ...FULL, name: 'CEFR-J v2', display_priority: 5 }) });
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.type(field(dialog, `${t.form.name} *`), '  CEFR-J v2  ');
    await userEvent.clear(field(dialog, t.form.priority));
    await userEvent.type(field(dialog, t.form.priority), '5');
    await save(dialog);
    await waitFor(() => expect(sent(r.calls, 'PATCH')).toHaveLength(1));
    expect(sent(r.calls, 'PATCH')[0].body).toEqual({ name: 'CEFR-J v2', display_priority: 5 });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText(named(t.toast.saved, 'CEFR-J v2'))).toBeInTheDocument();
  }, 20_000);

  it('the list shown after saving is the refetched one', async () => {
    let items = [OWNER, SRC];
    renderApp('/sources', {
      [LIST]: () => Response.json({ items }),
      [PATCH]: () => {
        items = [OWNER, { ...SRC, name: 'CEFR-J v2' }];
        return Response.json(items[1]);
      },
    });
    await screen.findAllByText(SRC.name);
    await userEvent.click(screen.getAllByRole('button', { name: named(t.editFor, SRC.name) })[0]);
    const dialog = await screen.findByRole('dialog', { name: named(t.editTitle, SRC.name) });
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.type(field(dialog, `${t.form.name} *`), 'CEFR-J v2');
    await save(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await screen.findAllByText('CEFR-J v2')).length).toBeGreaterThan(0);
    expect(screen.queryByText(SRC.name)).toBeNull();
  }, 20_000);

  it('emptying the URL sends url: null; the other empty-able text fields send an empty string', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => Response.json(FULL) });
    await userEvent.clear(field(dialog, t.form.url));
    await userEvent.clear(field(dialog, t.form.attribution));
    await save(dialog);
    await waitFor(() => expect(sent(r.calls, 'PATCH')).toHaveLength(1));
    expect(sent(r.calls, 'PATCH')[0].body).toEqual({ url: null, attribution: '' });
  });

  it('unticking "dùng làm nguồn level" lets version and license go blank', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => Response.json(FULL) });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: t.form.asLevelSource }));
    await userEvent.clear(field(dialog, t.form.version));
    await userEvent.clear(field(dialog, t.form.license));
    await save(dialog);
    await waitFor(() => expect(sent(r.calls, 'PATCH')).toHaveLength(1));
    expect(sent(r.calls, 'PATCH')[0].body).toEqual({ version: '', license: '' });
  });

  it('nothing changed (or only spaces around the same text): no request, the dialog just closes', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => Response.json(FULL) });
    await userEvent.type(field(dialog, t.form.attribution), '   ');
    await save(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent(r.calls, 'PATCH')).toHaveLength(0);
  });

  it('a blank name, a blank version or license while ticked, a non-http URL or a non-integer priority: refused in the form, nothing sent', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => Response.json(FULL) });
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.clear(field(dialog, `${t.form.version} *`));
    await userEvent.clear(field(dialog, `${t.form.license} *`));
    await userEvent.clear(field(dialog, t.form.url));
    await userEvent.type(field(dialog, t.form.url), 'ftp://example.com');
    await userEvent.clear(field(dialog, t.form.priority));
    await userEvent.type(field(dialog, t.form.priority), '1.5');
    await save(dialog);
    expect(await within(dialog).findAllByText(t.form.required)).toHaveLength(3);
    expect(within(dialog).getByText(t.form.urlInvalid)).toBeInTheDocument();
    expect(within(dialog).getByText(t.form.priorityInvalid)).toBeInTheDocument();
    expect(sent(r.calls, 'PATCH')).toHaveLength(0);
  });

  it('source-exists: the create form\'s message, the dialog stays open with what was typed', async () => {
    const { dialog } = await openEdit({ [PATCH]: () => problem(409, 'source-exists') });
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.type(field(dialog, `${t.form.name} *`), 'AGID');
    await save(dialog);
    expect(await within(dialog).findByText(vi.errors['source-exists'])).toBeInTheDocument();
    expect(field(dialog, `${t.form.name} *`)).toHaveValue('AGID');
  });

  it('a 400 with a violation on display_priority shows on the priority field; an unmapped one joins the banner', async () => {
    const { dialog } = await openEdit({
      [PATCH]: () => problem(400, 'validation-failed', { violations: ['display_priority: Too big', 'kind: Unrecognized key'] }),
    });
    await userEvent.clear(field(dialog, t.form.priority));
    await userEvent.type(field(dialog, t.form.priority), '99999999999');
    await save(dialog);
    expect(await within(dialog).findByText('Too big')).toBeInTheDocument();
    expect(within(dialog).getByText(`${vi.errors['validation-failed']} kind: Unrecognized key`)).toBeInTheDocument();
  });

  it('source-protected is shown in the dialog', async () => {
    const { dialog } = await openEdit({ [PATCH]: () => problem(409, 'source-protected') });
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.type(field(dialog, `${t.form.name} *`), 'x');
    await save(dialog);
    expect(await within(dialog).findByText('Nguồn của chủ dự án không sửa hoặc xóa được.')).toBeInTheDocument();
  });

  it('not-found (the source was deleted meanwhile): says so and reloads the list', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => problem(404, 'not-found') });
    const before = listCalls(r.calls).length;
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.type(field(dialog, `${t.form.name} *`), 'x');
    await save(dialog);
    expect(await within(dialog).findByText(vi.errors['not-found'])).toBeInTheDocument();
    await waitFor(() => expect(listCalls(r.calls).length).toBeGreaterThan(before));
  });

  it('429 on save: the rate-limit message, the dialog stays', async () => {
    const { dialog } = await openEdit({ [PATCH]: () => rateLimited(5) });
    await userEvent.clear(field(dialog, `${t.form.name} *`));
    await userEvent.type(field(dialog, `${t.form.name} *`), 'x');
    await save(dialog);
    expect(await within(dialog).findByText(vi.errors['rate-limited'])).toBeInTheDocument();
  });

  it('Hủy with unsaved changes asks "Bỏ thay đổi?" first; a clean Hủy closes at once', async () => {
    const { r, dialog } = await openEdit({ [PATCH]: () => Response.json(FULL) });
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await userEvent.click(screen.getAllByRole('button', { name: named(t.editFor, FULL.name) })[0]);
    const again = await screen.findByRole('dialog', { name: named(t.editTitle, FULL.name) });
    await userEvent.type(field(again, t.form.attribution), '!');
    await userEvent.click(within(again).getByRole('button', { name: vi.common.cancel }));
    const ask = await screen.findByRole('dialog', { name: vi.leave.discardTitle });
    await userEvent.click(within(ask).getByRole('button', { name: vi.leave.discard }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent(r.calls, 'PATCH')).toHaveLength(0);
  }, 20_000);
});

describe('source delete', () => {
  async function openDelete(routes: Record<string, Route> = {}, items = [OWNER, SRC]) {
    const r = renderApp('/sources', { [LIST]: () => Response.json({ items }), ...routes });
    await screen.findAllByText(SRC.name);
    await userEvent.click(screen.getAllByRole('button', { name: named(t.deleteFor, SRC.name) })[0]);
    const dialog = await screen.findByRole('dialog', { name: named(t.deleteTitle, SRC.name) });
    return { r, dialog };
  }

  it('asks first; Hủy sends nothing', async () => {
    const { r, dialog } = await openDelete({ [DELETE]: () => new Response(null, { status: 204 }) });
    expect(within(dialog).getByText(t.deleteBody)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent(r.calls, 'DELETE')).toHaveLength(0);
    expect(screen.getAllByText(SRC.name).length).toBeGreaterThan(0);
  });

  it('confirming deletes the source, toasts, and the list is reloaded without it', async () => {
    let items = [OWNER, SRC];
    const r = renderApp('/sources', {
      [LIST]: () => Response.json({ items }),
      [DELETE]: () => {
        items = [OWNER];
        return new Response(null, { status: 204 });
      },
    });
    await screen.findAllByText(SRC.name);
    await userEvent.click(screen.getAllByRole('button', { name: named(t.deleteFor, SRC.name) })[0]);
    const dialog = await screen.findByRole('dialog', { name: named(t.deleteTitle, SRC.name) });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent(r.calls, 'DELETE')).toHaveLength(1);
    expect(await screen.findByText(named(t.toast.deleted, SRC.name))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(SRC.name)).toBeNull());
    expect(screen.getAllByText(OWNER.name).length).toBeGreaterThan(0);
  }, 20_000);

  it('source-in-use: the dialog closes, a banner says why, the source stays in the list', async () => {
    const { r, dialog } = await openDelete({ [DELETE]: () => problem(409, 'source-in-use') });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText('Nguồn này đang được dùng (mức độ của từ hoặc lô nhập) nên không xóa được.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByText(SRC.name).length).toBeGreaterThan(0);
    expect(listCalls(r.calls)).toHaveLength(1);
  });

  it('source-protected: the banner says the owner\'s source cannot be deleted', async () => {
    const { dialog } = await openDelete({ [DELETE]: () => problem(409, 'source-protected') });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText('Nguồn của chủ dự án không sửa hoặc xóa được.')).toBeInTheDocument();
  });

  it('not-found (already deleted elsewhere): a banner, and the list is reloaded', async () => {
    const { r, dialog } = await openDelete({ [DELETE]: () => problem(404, 'not-found') });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText(vi.errors['not-found'])).toBeInTheDocument();
    await waitFor(() => expect(listCalls(r.calls).length).toBeGreaterThan(1));
  });

  it('the banner of a refused delete goes away on the next delete attempt', async () => {
    let first = true;
    const { dialog } = await openDelete({
      [DELETE]: () => {
        if (first) {
          first = false;
          return problem(409, 'source-in-use');
        }
        return new Response(null, { status: 204 });
      },
    });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    const banner = await screen.findByText(vi.errors['source-in-use']);
    await userEvent.click(screen.getAllByRole('button', { name: named(t.deleteFor, SRC.name) })[0]);
    const again = await screen.findByRole('dialog', { name: named(t.deleteTitle, SRC.name) });
    await userEvent.click(within(again).getByRole('button', { name: t.deleteConfirm }));
    await waitFor(() => expect(banner).not.toBeInTheDocument());
  }, 20_000);
});
