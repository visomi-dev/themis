import { type Page } from '@playwright/test';

export async function mockAuthorizedProjectView(page: Page, name: string, withContent = true): Promise<void> {
  await page.route('**/v1/product-visibility/projects/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        activity: withContent
          ? [{ id: 'activity-1', occurredAt: '2026-01-02T00:00:00.000Z', summary: 'Reviewed the plan' }]
          : [],
        context: withContent ? 'Approved project context.' : null,
        project: {
          id: route.request().url().split('/').pop() ?? '',
          name,
          sourceType: 'manual',
          status: 'active',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        state: 'authorized',
      }),
    });
  });
}
