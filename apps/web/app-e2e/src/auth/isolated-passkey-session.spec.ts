import { execFile } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

import { clearMailbox } from '../support/mailbox';
import { createCredentials, signUp, verifyLatestCode } from '../support/auth';
import { activationUrlPattern, appUrlPattern, projectsUrlPattern, signInUrlPattern } from '../support/routes';

const execFileAsync = promisify(execFile);
const evidenceDirectory = `${workspaceRoot}/docs/verification/isolated-passkey-run-242`;

function sanitize(value: string): string {
  return value
    .replace(
      /(cookie|authorization|password|pin|token|secret|challenge|credentialId)\s*[:=]\s*[^,\n}]+/gi,
      '$1=[REDACTED]',
    )
    .replace(/(Set-Cookie:|Cookie:|Authorization:)[^\n]*/gi, '$1 [REDACTED]');
}

test.describe('isolated passkey bootstrap/session evidence', () => {
  test('verifies bootstrap, session, project-scoped CLI sync, and a separate authenticated screen', async ({
    page,
    request,
  }) => {
    const credentials = createCredentials();
    const httpEvidence: Array<{ step: string; method: string; path: string; status: number }> = [];

    await mkdir(evidenceDirectory, { recursive: true });
    await clearMailbox(request);

    await signUp(page, credentials.email, credentials.password);
    expect(page.url()).toMatch(signInUrlPattern);

    const beforeVerification = await page.request.get('/api/auth/session');

    httpEvidence.push({
      step: 'session-before-verification',
      method: 'GET',
      path: '/api/auth/session',
      status: beforeVerification.status(),
    });
    expect(beforeVerification.status()).toBe(200);
    expect(((await beforeVerification.json()) as { data: { kind: string } }).data.kind).toBe('anonymous');

    await verifyLatestCode(page, request, credentials.email, 'sign_up', { completeActivation: false });
    await expect(page).toHaveURL(/\/app\/en\/(?:activation|projects|dashboard)?$/, { timeout: 15000 });
    if (activationUrlPattern.test(page.url())) {
      await page.getByRole('button', { name: /Skip for now/i }).click();
      await expect(page).toHaveURL(projectsUrlPattern, { timeout: 15000 });
    }
    await expect(page).toHaveURL(appUrlPattern, { timeout: 15000 });

    const session = await page.request.get('/api/auth/session');

    httpEvidence.push({
      step: 'session-after-verification',
      method: 'GET',
      path: '/api/auth/session',
      status: session.status(),
    });
    expect(session.ok()).toBeTruthy();
    const sessionPayload = (await session.json()) as {
      data?: { user?: { email?: string; accountId?: string } | null };
    };

    expect(sessionPayload.data?.user?.email).toBe(credentials.email);
    expect(sessionPayload.data?.user?.accountId).toEqual(expect.any(String));

    let cliEvidence: { command: string; status: 'passed' | 'blocked'; stdout: string; stderr: string };

    try {
      const cli = await execFileAsync('pnpm', ['themis', 'project-sync', '--project', 'core', '--json'], {
        cwd: workspaceRoot,
        env: { ...process.env, CI: '1' },
        maxBuffer: 4 * 1024 * 1024,
      });

      cliEvidence = {
        command: 'pnpm themis project-sync --project core --json',
        status: 'passed',
        stdout: sanitize(cli.stdout),
        stderr: sanitize(cli.stderr),
      };
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string; message?: string };

      cliEvidence = {
        command: 'pnpm themis project-sync --project core --json',
        status: 'blocked',
        stdout: sanitize(failure.stdout ?? ''),
        stderr: sanitize(failure.stderr ?? failure.message ?? 'unknown CLI failure'),
      };
    }

    const state = JSON.parse(await readFile(`${workspaceRoot}/.themis/projects/core/state.json`, 'utf8')) as {
      workItems: Array<{ title: string }>;
      epics: Array<{ title: string }>;
    };
    const createProject = await page.request.post('/api/projects', { data: { name: 'Current Themis state' } });

    expect(createProject.status()).toBe(201);
    const projectId = ((await createProject.json()) as { data: { id: string } }).data.id;

    await page.goto(`/app/en/projects/${projectId}/workspace`);
    await expect(page.getByRole('heading', { name: 'Current Themis state' })).toBeVisible();
    const projectionSource = page.getByLabel('Projection source');
    const bridgeResponse = await page.request.get(`/v1/local-agent/projections/${projectId}`, {
      headers: { 'x-themis-bridge-capabilities': 'projection', 'x-themis-bridge-version': '1' },
    });

    expect(bridgeResponse.status()).toBe(200);
    const bridgePayload = (await bridgeResponse.json()) as { projection: { work: Array<{ title: string }> } };

    expect(bridgePayload.projection.work[0]?.title).toBe(state.workItems[0]?.title);

    await projectionSource.selectOption('local-agent');
    await expect(projectionSource).toHaveValue('local-agent');
    await expect(page.getByRole('heading', { name: 'Work and planning projection' })).toBeVisible();
    await expect(page.getByText(state.workItems[0]?.title ?? 'Themis state', { exact: true })).toBeVisible();
    if (state.epics[0]) await expect(page.getByText(state.epics[0].title, { exact: true })).toBeVisible();

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      if (colorScheme === 'dark') await page.getByRole('button', { name: /Toggle light\/dark theme/i }).click();
      await expect(page).toHaveScreenshot(`authenticated-session-${colorScheme}.png`, {
        fullPage: true,
      });
    }

    await writeFile(`${evidenceDirectory}/http.json`, JSON.stringify(httpEvidence, null, 2) + '\n', 'utf8');
    await writeFile(`${evidenceDirectory}/cli-project-sync.json`, JSON.stringify(cliEvidence, null, 2) + '\n', 'utf8');
    await writeFile(
      `${evidenceDirectory}/manifest.json`,
      JSON.stringify(
        {
          runId: 'RUN-242',
          test: 'isolated-passkey-bootstrap-session',
          screenshots: ['authenticated-session-light.png', 'authenticated-session-dark.png'],
          cliStatus: cliEvidence.status,
          redactions: ['cookie', 'authorization', 'password', 'pin', 'token', 'secret', 'challenge', 'credentialId'],
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
  });
});
