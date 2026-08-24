import { expect, test } from '@playwright/test';

import { createCredentials, authenticateViaApi, signOutViaMenu } from '../support/auth';
import { projectsRoute, signInUrlPattern } from '../support/routes';

test.describe.configure({ timeout: 60000 });

test.describe('/app/projects/:projectId', () => {
  async function openWorkspace(
    page: Parameters<typeof authenticateViaApi>[0],
    request: Parameters<typeof authenticateViaApi>[1],
  ) {
    const credentials = createCredentials();

    await authenticateViaApi(page, request, credentials.email, credentials.password);
    const create = await page.request.post('/api/projects', { data: { name: 'Detail workspace fixture' } });

    expect(create.status()).toBe(201);
    const projectId = ((await create.json()) as { data: { id: string } }).data.id;

    await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'visible' });
    await page.goto(`/app/en/projects/${projectId}/workspace`);
    await expect(page.getByRole('heading', { name: 'Detail workspace fixture' })).toBeVisible({ timeout: 15000 });
  }

  test('navigates to the read-only project workspace', async ({ page, request }) => {
    await openWorkspace(page, request);
    await expect(page.getByText('Read-only projection; mutations are not available.')).toBeVisible();
  });

  test('shows project workspace state and denies mutation controls', async ({ page, request }) => {
    await openWorkspace(page, request);
    await expect(page.getByText('visible', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /run|execute|save|approve|reject|create|transition/i })).toHaveCount(
      0,
    );
  });

  test('renders protected empty workspace state safely', async ({ page, request }) => {
    await openWorkspace(page, request);
    await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'empty' });
    await page.reload();
    await expect(page.getByText('empty', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Read-only projection; mutations are not available.')).toBeVisible();
  });

  test('sign out returns to sign-in', async ({ page, request }) => {
    const credentials = createCredentials();

    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.goto(projectsRoute);

    await signOutViaMenu(page);

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
