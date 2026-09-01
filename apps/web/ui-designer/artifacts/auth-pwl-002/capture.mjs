import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const port = 4312;
const baseUrl = `http://127.0.0.1:${port}`;
const artifactDirectory = new URL('./', import.meta.url).pathname;
const outputDirectory = join(artifactDirectory, 'screenshots');
const states = {
  'passwordless-access': [
    'ready',
    'loading',
    'cancelled',
    'error',
    'email',
    'otp',
    'otp-error',
    'account-choice',
    'enrollment',
    'enrollment-loading',
    'enrollment-cancelled',
    'verify-new-passkey',
    'enrollment-error',
    'recovery-expired',
    'success',
  ],
  'passkey-management': [
    'list',
    'add',
    'add-loading',
    'add-cancelled',
    'rename',
    'updated',
    'remove',
    'removed',
    'last-passkey',
    'error',
    'brand-evaluation',
  ],
};
const viewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};
const assetPaths = [
  'assets/themis-isotype.svg',
  'assets/themis-isotype-stroke.svg',
  'assets/themis-logotype.svg',
  'assets/themis-logotype-stroke.svg',
];

const assetInspection = [];

for (const assetPath of assetPaths) {
  const source = await readFile(assetPath, 'utf8');

  assetInspection.push({
    assetPath,
    byteLength: Buffer.byteLength(source),
    hasCurrentColor: source.includes('currentColor'),
    safe: !/<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i.test(source),
    sha256: createHash('sha256').update(source).digest('hex'),
  });
}

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

const server = spawn(process.execPath, ['dist/apps/web/ui-designer/main.js'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';

server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`ui-designer exited before capture: ${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/healthz`);

      if (response.ok) return;
    } catch {
      // The local preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`Timed out waiting for ui-designer: ${serverOutput}`);
}

const results = [];
let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  for (const [slug, stateNames] of Object.entries(states)) {
    for (const state of stateNames) {
      for (const [viewportName, viewport] of Object.entries(viewports)) {
        for (const theme of ['light', 'dark']) {
          const context = await browser.newContext({
            colorScheme: theme,
            deviceScaleFactor: 1,
            locale: 'en-GB',
            reducedMotion: 'reduce',
            timezoneId: 'UTC',
            viewport,
          });
          const page = await context.newPage();
          const consoleErrors = [];
          const failedRequests = [];

          page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
          });
          page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}`));

          const url = `${baseUrl}/preview/${slug}/frame?theme=${theme}&state=${state}`;
          const response = await page.goto(url, { waitUntil: 'networkidle' });

          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.evaluate(() => document.fonts.ready);
          await page.locator(`[data-state="${state}"]`).waitFor({ state: 'visible' });

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
            const bodyText = document.body.innerText;
            const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
            const colorCanvas = document.createElement('canvas');

            colorCanvas.width = 1;
            colorCanvas.height = 1;
            const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
            const parseColor = (value) => {
              if (!colorContext) throw new Error('Could not create a canvas context for contrast inspection.');

              colorContext.clearRect(0, 0, 1, 1);
              colorContext.fillStyle = value;
              colorContext.fillRect(0, 0, 1, 1);

              return [...colorContext.getImageData(0, 0, 1, 1).data].slice(0, 3);
            };
            const relativeLuminance = ([red, green, blue]) => {
              const channels = [red, green, blue].map((channel) => {
                const normalized = channel / 255;

                return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
              });

              return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
            };
            const contrastChecks = [...document.querySelectorAll('[class~="text-white"]')]
              .filter((element) => visible(element) && !element.matches(':disabled'))
              .map((element) => {
                const style = getComputedStyle(element);
                const foregroundLuminance = relativeLuminance(parseColor(style.color));
                const backgroundLuminance = relativeLuminance(parseColor(style.backgroundColor));
                const ratio =
                  (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
                  (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

                return {
                  background: style.backgroundColor,
                  foreground: style.color,
                  label: element.textContent?.trim() ?? element.getAttribute('aria-label') ?? element.tagName,
                  ratio: Math.round(ratio * 100) / 100,
                };
              });

            return {
              contrastChecks,
              contrastFailures: contrastChecks.filter(({ ratio }) => ratio < 4.5),
              externalResources: resources.filter((url) => new URL(url).hostname !== '127.0.0.1'),
              horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
              imagesComplete: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
              prohibitedControls: document.querySelectorAll(
                'input[type="password"], [autocomplete="current-password"], [autocomplete="new-password"]',
              ).length,
              prohibitedSecretTermsVisible:
                /challenge(?: hash| value)|credential id|public key bytes|recovery code:\s*\S+/i.test(bodyText),
              prohibitedMethodsVisible:
                /continue with (?:google|github|facebook)|remember me|sign in with password|create a password/i.test(
                  bodyText,
                ),
              undersizedTargets: targets.filter((target) => target.width < 44 || target.height < 44),
            };
          });

          const firstTarget = page.locator('a, button, input').filter({ visible: true }).first();

          await firstTarget.focus();
          const focus = await firstTarget.evaluate((element) => {
            const style = getComputedStyle(element);

            return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
          });
          const filename = `${slug}--${state}--${viewportName}--${theme}.png`;

          await page.screenshot({
            animations: 'disabled',
            caret: 'hide',
            fullPage: true,
            path: join(outputDirectory, filename),
          });
          results.push({
            consoleErrors,
            failedRequests,
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
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

const report = { assetInspection, generatedAt: '2026-08-31T00:00:00.000Z', results };

await writeFile(join(artifactDirectory, 'inspection.json'), `${JSON.stringify(report, null, 2)}\n`);

const failures = results.filter(
  (result) =>
    result.responseStatus !== 200 ||
    result.consoleErrors.length > 0 ||
    result.failedRequests.length > 0 ||
    result.inspection.contrastFailures.length > 0 ||
    result.inspection.externalResources.length > 0 ||
    result.inspection.horizontalOverflow ||
    !result.inspection.imagesComplete ||
    result.inspection.prohibitedControls > 0 ||
    result.inspection.prohibitedSecretTermsVisible ||
    result.inspection.prohibitedMethodsVisible ||
    result.inspection.undersizedTargets.length > 0 ||
    result.focus.outlineStyle === 'none' ||
    result.focus.outlineWidth === '0px',
);
const unsafeAssets = assetInspection.filter((asset) => !asset.safe);

console.log(`Captured ${results.length} deterministic screenshots.`);
console.log(`Inspected ${assetInspection.length} local SVG assets; unsafe assets: ${unsafeAssets.length}.`);
console.log(`Inspection failures: ${failures.length}.`);
if (failures.length > 0 || unsafeAssets.length > 0) {
  console.log(JSON.stringify({ failures, unsafeAssets }, null, 2));
  process.exitCode = 1;
}
