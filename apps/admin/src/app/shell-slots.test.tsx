import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import vi from '../../messages/vi.json';
import { makeMe } from '../auth/test-support';
import { ME_ADMIN, renderApp } from '../features/staff/test-utils';

const handlers = { 'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }) };

describe('shell slots', () => {
  it('PageActions puts "Upload CSV" in the sheet header beside the h1', async () => {
    renderApp('/uploads', handlers, ME_ADMIN);
    const button = await screen.findByRole('button', { name: vi.uploads.upload }, { timeout: 5000 });
    const header = button.closest('header');
    expect(header).not.toBeNull();
    expect(header).toContainElement(screen.getByRole('heading', { level: 1, name: vi.nav.uploads }));
    expect(header!.closest('main')).not.toBeNull();
  });

  it('an editor without content.edit sees no page action', async () => {
    renderApp('/uploads', handlers, makeMe({ permissions: ['content.import', 'content.publish'] }));
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.uploads }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: vi.uploads.upload })).toBeNull();
  });
});
