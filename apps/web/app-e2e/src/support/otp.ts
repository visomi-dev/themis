import type { Page } from '@playwright/test';

export const fillOtp = async (page: Page, code: string) => {
  const unifiedInput = page.getByRole('textbox', { name: 'Verification code' });

  if (await unifiedInput.isVisible().catch(() => false)) {
    await unifiedInput.fill(code);

    return;
  }

  for (const [index, digit] of code.split('').entries()) {
    await page.locator('[data-slot=pin-input] input').nth(index).fill(digit);
  }
};
