import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { ME_ADMIN, renderApp } from '../features/staff/test-utils';
import type { Permission } from '../auth/session-store';
import { makeMe, problem } from '../auth/test-support';

const EDITOR_PERMS: Permission[] = ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'];
const EDITOR = makeMe({ id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor', permissions: EDITOR_PERMS });
const uploads = { 'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }) };

describe('NoAccess', () => {
  it('an editor at /staff keeps the page title, sees the no-access text, and [Về trang chủ] leads to /uploads', async () => {
    const r = renderApp('/staff', uploads, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.staff);
    expect(screen.queryByRole('link', { name: vi.nav.staff })).toBeNull();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/staff'))).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: vi.noAccess.home }));
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.uploads })).toBeInTheDocument();
    expect(screen.queryByText(vi.noAccess.title)).toBeNull();
  });

  it('an editor at an unbuilt admin-only path (/users) gets the same view, not "Sắp có"', async () => {
    renderApp('/users', uploads, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.users);
    expect(screen.queryByText(vi.comingSoon.title)).toBeNull();
  });

  it('both languages have the text', () => {
    expect(vi.noAccess.title).toBe('Bạn không có quyền xem trang này.');
    expect(en.noAccess.title).toBe("You don't have access to this page.");
    expect(vi.noAccess.home).toBeTruthy();
    expect(en.noAccess.home).toBeTruthy();
  });

  it('Review Focus 5: a 403 forbidden on a request renders errors.forbidden, and once /me returns editor permissions the admin entries leave the sidebar', async () => {
    let meReads = 0;
    renderApp('/export', {
      'GET /v1/me': () => Response.json(meReads++ === 0 ? ME_ADMIN : EDITOR),
      'GET /v1/admin/taxonomy/topics': () => Response.json({ items: [], next_page_token: null }),
      'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }),
      'GET /v1/admin/content/senses/export': () => problem(403, 'forbidden'),
    });
    await userEvent.click(await screen.findByRole('button', { name: vi.export.download }));
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
    // The transport re-reads /me after the 403 (session-store `send`); the screen makes no second call of its own.
    await waitFor(() => expect(screen.queryByRole('link', { name: vi.nav.staff })).toBeNull());
    expect(screen.queryByRole('link', { name: vi.nav.transactions })).toBeNull();
    expect(screen.getAllByRole('link', { name: vi.nav.export }).length).toBeGreaterThan(0);
    expect(meReads).toBe(2);
  });
});
