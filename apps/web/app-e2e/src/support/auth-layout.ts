import { expect, type Page } from '@playwright/test';

export async function assertOpenDesignChrome(page: Page): Promise<void> {
  await expect(page.locator('[data-od-id="auth-shell"]')).toBeVisible();
  await expect(page.locator('[data-od-id="brand"]')).toContainText('Themis');
  await expect(page.locator('[data-od-id="lang-menu"]')).toBeVisible();
  await expect(page.locator('[data-od-id="theme-toggle"]')).toBeVisible();
  await expect(page.locator('[data-od-id="theme-toggle"]')).toHaveAttribute('aria-label', 'Toggle light/dark theme');
}
