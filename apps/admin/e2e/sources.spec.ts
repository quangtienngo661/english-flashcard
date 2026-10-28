import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { expectNoHorizontalScroll } from './support/overflow';
import { problem, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.sources;
// The table and the cards are both in the page; the one that does not fit the viewport is hidden.
const shown = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true }).first();
const SOURCES = '/v1/admin/content/sources';
const OWNER = { id: 'o1', kind: 'owner', name: 'owner', version: '', url: null, license: '', attribution: '', display_priority: 0 };
const SRC = { id: 's1', kind: 'third_party', name: 'CEFR-J Vocabulary Profile', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 };

test('edit: the dialog has no serious axe violations, sends only what changed, and the list shows the new name; the owner row has no buttons', async ({ page }) => {
  let items = [OWNER, SRC];
  await signedInAs(page, 'editor', {
    [`GET ${SOURCES}`]: () => ({ json: { items } }),
    [`PATCH ${SOURCES}/s1`]: () => {
      items = [OWNER, { ...SRC, name: 'CEFR-J v2' }];
      return { json: items[1] };
    },
  });
  await page.goto('/sources');
  await expect(shown(page, SRC.name)).toBeVisible();
  await expect(page.getByRole('button', { name: t.editFor.replace('{name}', OWNER.name) })).toHaveCount(0);
  await expect(page.getByRole('button', { name: t.deleteFor.replace('{name}', OWNER.name) })).toHaveCount(0);
  expect(await seriousViolations(page)).toEqual([]);
  await expectNoHorizontalScroll(page);

  await page.getByRole('button', { name: t.editFor.replace('{name}', SRC.name) }).click();
  const dialog = page.getByRole('dialog', { name: t.editTitle.replace('{name}', SRC.name) });
  await expect(dialog).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await dialog.getByLabel(`${t.form.name} *`).fill('CEFR-J v2');
  await dialog.getByRole('button', { name: t.form.save }).click();
  await expect(dialog).toBeHidden();
  expect(requests(page, 'PATCH', `${SOURCES}/s1`).map((r) => r.body)).toEqual([{ name: 'CEFR-J v2' }]);
  await expect(shown(page, 'CEFR-J v2')).toBeVisible();
});

test('delete: asks first (no serious axe violations), sends DELETE, and a source in use stays with a banner that says why', async ({ page }) => {
  let inUse = true;
  let items = [OWNER, SRC];
  await signedInAs(page, 'editor', {
    [`GET ${SOURCES}`]: () => ({ json: { items } }),
    [`DELETE ${SOURCES}/s1`]: () => {
      if (inUse) return problem(409, 'source-in-use');
      items = [OWNER];
      return { status: 204 };
    },
  });
  await page.goto('/sources');
  await page.getByRole('button', { name: t.deleteFor.replace('{name}', SRC.name) }).click();
  const dialog = page.getByRole('dialog', { name: t.deleteTitle.replace('{name}', SRC.name) });
  await expect(dialog).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: t.deleteConfirm }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(vi.errors['source-in-use'])).toBeVisible();
  await expect(shown(page, SRC.name)).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  inUse = false;
  await page.getByRole('button', { name: t.deleteFor.replace('{name}', SRC.name) }).click();
  await page.getByRole('dialog', { name: t.deleteTitle.replace('{name}', SRC.name) }).getByRole('button', { name: t.deleteConfirm }).click();
  await expect(page.getByText(SRC.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText(vi.errors['source-in-use'])).toHaveCount(0);
  expect(requests(page, 'DELETE', `${SOURCES}/s1`)).toHaveLength(2);
});
