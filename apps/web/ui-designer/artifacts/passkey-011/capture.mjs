import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const baseUrl = process.env.UI_DESIGNER_URL ?? 'http://localhost:4300';
const outputDirectory = new URL('./screenshots/', import.meta.url).pathname;
const states = {
  'passkey-sign-up': ['default', 'secondary-password', 'pending-verification', 'error'],
  'passkey-sign-in': ['default', 'retry', 'disclosed-password', 'error'],
  'security-password-setup': ['setup'],
  'security-passkeys': ['list', 'add', 'name', 'revoke', 'last-access-blocked'],
};
const viewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const [slug, stateNames] of Object.entries(states)) {
  for (const state of stateNames) {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          colorScheme: theme,
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
          viewport,
        });
        const page = await context.newPage();
        const consoleErrors = [];

        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        const url = `${baseUrl}/preview/${slug}/frame?theme=${theme}&state=${state}`;
        const response = await page.goto(url, { waitUntil: 'networkidle' });

        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.locator('body').waitFor({ state: 'visible' });

        const inspection = await page.evaluate(() => {
          const visible = (element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();

            return (
              box.width > 0 &&
              box.height > 0 &&
              !element.hidden &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            );
          };
          const targets = [...document.querySelectorAll('a, button, input, select, textarea')]
            .filter(visible)
            .map((element) => {
              const box = element.getBoundingClientRect();

              return {
                label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.id,
                width: Math.round(box.width),
                height: Math.round(box.height),
              };
            });
          const passwordValues = [...document.querySelectorAll('input[type="password"]')].map((input) => input.value);
          const bodyText = document.body.innerText;

          return {
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            undersizedTargets: targets.filter((target) => target.width < 44 || target.height < 44),
            passwordFieldsBlank: passwordValues.every((value) => value === ''),
            prohibitedSecretTermsVisible:
              /challenge(hash| value)|credential id|public key bytes|recovery code:\s*\S+/i.test(bodyText),
          };
        });

        const firstTarget = page.locator('a, button, input').filter({ visible: true }).first();

        await firstTarget.focus();
        const focus = await firstTarget.evaluate((element) => {
          const style = getComputedStyle(element);

          return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
        });
        const filename = `${slug}--${state}--${viewportName}--${theme}.png`;

        await page.screenshot({ animations: 'disabled', fullPage: true, path: join(outputDirectory, filename) });
        results.push({
          consoleErrors,
          filename,
          focus,
          inspection,
          responseStatus: response?.status() ?? null,
          slug,
          state,
          theme,
          url,
          viewport: viewportName,
        });
        await context.close();
      }
    }
  }
}

await browser.close();
await writeFile(new URL('./inspection.json', import.meta.url), `${JSON.stringify(results, null, 2)}\n`);

const failures = results.filter(
  (result) =>
    result.responseStatus !== 200 ||
    result.consoleErrors.length > 0 ||
    result.inspection.horizontalOverflow ||
    result.inspection.undersizedTargets.length > 0 ||
    !result.inspection.passwordFieldsBlank ||
    result.inspection.prohibitedSecretTermsVisible ||
    result.focus.outlineStyle === 'none' ||
    result.focus.outlineWidth === '0px',
);

console.log(`Captured ${results.length} deterministic screenshots.`);
console.log(`Inspection failures: ${failures.length}.`);
if (failures.length > 0) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
