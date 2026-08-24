import { expect, test } from '@playwright/test';

import { authenticateViaApi, createCredentials, signOutViaApi } from '../support/auth';

test.describe('legacy project projection routes', () => {
  async function openProjection(
    page: Parameters<typeof authenticateViaApi>[0],
    request: Parameters<typeof authenticateViaApi>[1],
    state: 'visible' | 'empty' | 'locked' | 'stale' | 'unavailable' | 'error' | 'unauthorized' | 'malformed',
  ) {
    const credentials = createCredentials();

    await authenticateViaApi(page, request, credentials.email, credentials.password);
    const create = await page.request.post('/api/projects', { data: { name: 'Projection fixture' } });

    expect(create.status()).toBe(201);
    const projectId = ((await create.json()) as { data: { id: string } }).data.id;

    await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': state });
    await page.goto(`/app/en/projects/${projectId}/workspace`);
    await expect(page.getByRole('main').last()).toBeVisible();
  }

  for (const state of [
    'visible',
    'empty',
    'locked',
    'stale',
    'unavailable',
    'error',
    'unauthorized',
    'malformed',
  ] as const) {
    test(`renders ${state} projection without disclosure or mutation controls`, async ({ page, request }) => {
      await openProjection(page, request, state);

      if (state === 'unauthorized') {
        await expect(page.getByRole('heading', { name: 'Project context' })).toBeVisible();
        await expect(page.getByText('Projection fixture')).toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', { name: 'Projection fixture' })).toBeVisible();
        await expect(page.getByText(state, { exact: true }).first()).toBeVisible();
      }

      await expect(page.getByText('Protected details appear only through an authorized mediated read.')).toBeVisible();
      await expect(page.getByText('Read-only projection; mutations are not available.')).toBeVisible();
      await expect(
        page.getByRole('button', { name: /run|execute|save|approve|reject|create|transition/i }),
      ).toHaveCount(0);
    });
  }

  test('rejects a projection read from another tenant', async ({ page, request }) => {
    const first = createCredentials();

    await authenticateViaApi(page, request, first.email, first.password);
    const create = await page.request.post('/api/projects', { data: { name: 'Tenant-isolated projection' } });

    expect(create.status()).toBe(201);
    const projectId = ((await create.json()) as { data: { id: string } }).data.id;

    const second = createCredentials();

    await signOutViaApi(page);
    await page.context().clearCookies();
    await authenticateViaApi(page, request, second.email, second.password);
    const response = await page.request.get(`/api/projects/${projectId}/workspace`);

    expect(response.status()).toBe(404);
    expect(JSON.stringify(await response.json())).not.toContain('Tenant-isolated projection');
  });
});
