import { expect, test } from '@playwright/test';

import { createCredentials, authenticateViaApi } from '../support/auth';
import { galleryUrlPattern } from '../support/routes';

test.describe.configure({ timeout: 60000 });

test.describe('/app/gallery', () => {
  test.beforeEach(async ({ page, request }) => {
    const credentials = createCredentials();

    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.goto('/app/en/gallery');
    await expect(page).toHaveURL(galleryUrlPattern);
  });

  test('renders the gallery sections with a heading and the filter input', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Themis UI Gallery' })).toBeVisible();
    await expect(page.locator('[data-od-id="gallery-section-actions"]')).toBeVisible();
    await expect(page.locator('[data-od-id="gallery-section-overlays"]')).toBeVisible();
  });

  test('filters the visible cards by selector substring', async ({ page }) => {
    const filter = page.getByRole('searchbox', { name: 'Filter components' });

    await filter.fill('button');
    await expect(page.locator('[data-od-id="gallery-card-button"]').first()).toBeVisible();
    await expect(page.locator('[data-od-id="gallery-section-overlays"]')).toHaveCount(0);
  });

  test('listbox supports keyboard navigation and selection', async ({ page }) => {
    const listbox = page.locator('[data-od-id="gallery-card-listbox"] [role="listbox"]').first();

    await listbox.focus();
    await page.waitForTimeout(200);
    await listbox.press('ArrowDown');
    await page.waitForTimeout(200);
    await listbox.press('Enter');
    await page.waitForTimeout(200);

    const selected = listbox.locator('[role="option"][aria-selected="true"]');
    const active = listbox.locator('[role="option"].cdk-option-active');

    await expect(selected).toHaveCount(1);
    await expect(active).toHaveCount(1);
  });
});
