import { expect, test } from '@playwright/test';

import { authenticateViaApi, createCredentials } from '../support/auth';

test('composed gateway serves the protected read-only workspace surfaces', async ({ page, request }) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const response = await page.request.post('/api/projects', { data: { name: 'Gateway workspace fixture' } });

  expect(response.status()).toBe(201);
  const projectId = (await response.json()).data.id as string;

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'visible' });
  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('heading', { name: 'Gateway workspace fixture' })).toBeVisible();
  await expect(page.getByText('Protected work item')).toBeVisible();

  await page.goto(`/app/en/projects/${projectId}/validation`);
  await expect(page.getByRole('heading', { name: 'Validation and evidence' })).toBeVisible();
  await expect(page.getByText('Focused read-model and route validation recorded.')).toBeVisible();

  await page.goto(`/app/en/projects/${projectId}/timeline`);
  await expect(page.getByRole('heading', { name: 'Timeline', exact: true })).toBeVisible();
  await expect(page.getByText('Protected activity projection')).toBeVisible();
  await expect(page.getByRole('button', { name: /approve|reject|execute|save|run/i })).toHaveCount(0);
});
