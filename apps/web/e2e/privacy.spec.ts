import { expect, test } from '@playwright/test';

// Legal links are hidden until launch (owner, 09/10/2026); the pages still exist at their URLs.
// When the links come back: delete the first test and remove `.skip` from the describe below.
test('legal links are hidden: no Privacy/Terms link in the footer or the consent label', async ({ page }) => {
  for (const [locale, privacy, terms] of [['vi', 'Chính sách bảo mật', 'Điều khoản sử dụng'], ['en', 'Privacy Policy', 'Terms of Use']]) {
    await page.goto(`/${locale}`);
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: privacy })).toHaveCount(0);
    await expect(footer.getByRole('link', { name: terms })).toHaveCount(0);
    const form = page.locator('#waitlist-hero');
    await expect(form.getByRole('link', { name: privacy })).toHaveCount(0);
    await expect(form).toContainText(privacy);
  }
});

test.describe.skip('legal links (hidden until launch)', () => {
  test('Review Focus 3: policy link in the consent label opens /privacy and leaves the box unticked', async ({ page }) => {
    await page.goto('/en');
    const form = page.locator('#waitlist-hero');
    await form.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL(/\/en\/privacy$/);
    await page.goBack();
    await expect(page.locator('#waitlist-hero').getByRole('checkbox')).not.toBeChecked();
  });

  test('footer Privacy Policy is a real link', async ({ page }) => {
    await page.goto('/vi');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Chính sách bảo mật' }).click();
    await expect(page).toHaveURL(/\/vi\/privacy$/);
  });
});

test('privacy page follows the site robots setting, is not a draft, and names the contact address', async ({ page }) => {
  // e2e builds without NEXT_PUBLIC_INDEXABLE, so the whole site is noindex (LP11); the page must not add its own override.
  const robotsOf = async (path: string) => {
    await page.goto(path);
    return page.locator('meta[name="robots"]').getAttribute('content');
  };
  for (const locale of ['vi', 'en']) {
    expect(await robotsOf(`/${locale}/privacy`)).toBe(await robotsOf(`/${locale}`));
    await page.goto(`/${locale}/privacy`);
    await expect(page.getByRole('main')).toContainText('hello@wordmet.com');
    await expect(page.getByRole('main')).not.toContainText(locale === 'vi' ? 'bản nháp' : 'draft');
  }
});
