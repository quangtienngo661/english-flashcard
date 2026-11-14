// Run through the opt-in topic scale test with the learner app on localhost:3001.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const web = 'http://localhost:3001';
const api = 'http://localhost:33492';
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  await context.addCookies([{
    name: 'refresh_token', value: process.env.WORDMET_TEST_REFRESH,
    url: api, httpOnly: true, sameSite: 'Lax',
  }]);
  const page = await context.newPage();
  const responses = [];
  page.on('response', (response) => {
    if (response.url().startsWith(api) && response.request().method() !== 'OPTIONS') responses.push(response);
  });
  const paths = () => responses.map((response) => new URL(response.url()).pathname);
  const topic = (code) => `${web}/vi/app/topic?code=${code}&level=B2`;
  const successful = async (path, count, size) => {
    const matching = responses.filter((response) => new URL(response.url()).pathname === path);
    assert.equal(matching.length, count, path);
    for (const response of matching) {
      assert.equal(response.status(), 200, path);
      if (size) size(new URL(response.url()).searchParams);
      const body = await response.body();
      console.log(`[browser topic] ${path}: ${body.length} bytes, ${response.request().timing().responseEnd.toFixed(1)} ms`);
    }
  };
  const browse = '/v1/senses';
  const learning = '/v1/items';
  const summary = '/v1/items/topic-summary';
  const suggestions = '/v1/topics/suggestions';
  const statusSize = (count) => (params) => assert.equal(params.get('sense_ids').split(',').length, count);
  const rows = page.locator('main section li');

  await page.goto(topic('test-vstep'), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(rows).toHaveCount(20, { timeout: 60_000 });
  await expect(page.getByText(/2\.694 từ gợi ý/)).toBeVisible();
  await expect(page.getByText(/2\.000 đang học/)).toBeVisible();
  assert.ok(paths().includes('/v1/me'), 'authenticated API control');
  await successful(browse, 1, (params) => assert.equal(params.get('page_size'), '20'));
  await successful(learning, 1, statusSize(20));
  await successful(summary, 1);
  console.log('[browser topic] first page request paths', paths().join(', '));
  const firstRow = await rows.first().textContent();
  responses.length = 0;
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await expect(rows.first()).not.toHaveText(firstRow);
  await expect(rows).toHaveCount(20);
  await successful(browse, 1, (params) => assert.ok(params.get('page_token')));
  await successful(learning, 1, statusSize(20));
  await successful(summary, 0);
  await page.getByRole('button', { name: 'Trang trước' }).click();
  await expect(rows.first()).toHaveText(firstRow);
  await successful(browse, 1);
  await successful(learning, 1);

  responses.length = 0;
  await page.goto(topic('test-small'));
  await expect(rows).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Trang sau' })).toHaveCount(0);
  await successful(browse, 1);
  await successful(learning, 1, statusSize(8));

  responses.length = 0;
  await page.goto(`${web}/vi/app`);
  const cards = page.locator('main a[href*="/app/topic?"]');
  await expect(cards).toHaveCount(4, { timeout: 60_000 });
  await successful(suggestions, 1);
  const links = () => cards.evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  const initial = await links();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  assert.deepEqual(await links(), initial);
  await successful(suggestions, 1);
  await page.reload();
  await expect(cards).toHaveCount(4);
  await successful(suggestions, 2);
  await page.locator('main a[href*="/app/topic?"][href*="test-vstep"]').click();
  await expect(rows).toHaveCount(20);
  console.log('[browser topic] verified 20 / 20 / 8 rows, cached Previous, and four cards per visit');
} finally {
  await browser.close();
}
