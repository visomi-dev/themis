import { expect, test } from '@playwright/test';

import { authenticateViaApi, createCredentials } from '../support/auth';

test.setTimeout(120_000);

type Visibility = 'visible' | 'empty' | 'locked' | 'unavailable' | 'stale' | 'error' | 'unauthorized' | 'malformed';

test('Angular app boundary reads every operational state without mutation or protected disclosure', async ({
  page,
  request,
}) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const create = await page.request.post('/api/projects', { data: { name: 'Operational workspace E2E fixture' } });

  expect(create.status()).toBe(201);
  const projectId = (await create.json()).data.id as string;
  const mutations: string[] = [];

  page.on('request', (event) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(event.method())) mutations.push(event.method());
  });

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'visible' });
  await page.goto('/app/en');
  await expect(page.getByRole('heading', { name: 'Project Workspace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Operational workspace E2E fixture' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New project' })).toHaveCount(0);

  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('main').last()).toBeVisible();

  for (const state of [
    'visible',
    'empty',
    'locked',
    'unavailable',
    'stale',
    'error',
    'unauthorized',
    'malformed',
  ] as const) {
    await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': state });
    await page.reload();
    await expect(page.getByText(state, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Read-only projection; mutations are not available.')).toBeVisible();
    await expect(page.getByRole('button', { name: /run project seed/i })).toHaveCount(0);

    const response = await page.request.get(`/api/projects/${projectId}/workspace`, {
      headers: { 'x-operational-workspace-state': state },
    });

    expect(response.status()).toBe(state === 'unauthorized' ? 401 : 200);
    if (state === 'unauthorized') continue;
    const body = (await response.json()).data as {
      readOnly: boolean;
      project: { state: Visibility; items: Array<Record<string, string | null>> };
      epics: { state: Visibility; items: Array<Record<string, string | null>> };
      workItems: { state: Visibility; items: Array<Record<string, string | null>> };
      runs: { state: Visibility; items: Array<Record<string, string | null>> };
      evidence: { state: Visibility; items: Array<Record<string, string | null>> };
      reviews: { state: Visibility; items: Array<Record<string, string | null>> };
      activity: { state: Visibility; items: Array<Record<string, string | null>> };
    };

    expect(body.readOnly).toBe(true);
    const collections = [body.epics, body.workItems, body.runs, body.evidence, body.reviews, body.activity];

    expect(
      collections.every(
        (collection) => collection.state === state && !JSON.stringify(collection).includes('contentMarkdown'),
      ),
      JSON.stringify({ state, collections }),
    ).toBe(true);
  }

  expect(mutations).toEqual([]);

  const otherCredentials = createCredentials();

  await page.context().clearCookies();
  await authenticateViaApi(page, request, otherCredentials.email, otherCredentials.password);
  const isolated = await page.request.get(`/api/projects/${projectId}/workspace`);

  expect(isolated.status()).toBe(404);
  expect(JSON.stringify(await isolated.json())).not.toContain('Operational workspace E2E fixture');
});

test('Angular adapter rejects malformed nested entity payloads as malformed', async ({ page, request }) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const create = await page.request.post('/api/projects', { data: { name: 'Malformed workspace E2E fixture' } });

  expect(create.status()).toBe(201);
  const projectId = (await create.json()).data.id as string;

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'malformed' });
  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('main').last()).toBeVisible();
  await expect(page.getByText(/Protected details appear only through an authorized mediated read/i)).toBeVisible();
  await expect(page.getByText(/No execution or mutation controls are available/i)).toBeVisible();
});

test('Angular adapter falls back safely when HTTP returns malformed JSON', async ({ page, request }) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const create = await page.request.post('/api/projects', { data: { name: 'Malformed JSON workspace E2E fixture' } });

  expect(create.status()).toBe(201);
  const projectId = (await create.json()).data.id as string;

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-http-case': 'malformed-json' });
  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('main').last()).toBeVisible();
  await expect(page.getByText(/Protected details appear only through an authorized mediated read/i)).toBeVisible();
  await expect(page.getByText(/No execution or mutation controls are available/i)).toBeVisible();
});

test('protected denial states remain semantic, keyboard reachable, and redacted', async ({ page, request }) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const create = await page.request.post('/api/projects', { data: { name: 'Accessible denial fixture' } });

  expect(create.status()).toBe(201);
  const projectId = (await create.json()).data.id as string;

  for (const state of ['unauthorized', 'locked', 'unavailable', 'error'] as const) {
    await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': state });
    await page.goto(`/app/en/projects/${projectId}/workspace`);

    await expect(page.getByRole('main').last()).toBeVisible();
    if (state === 'unauthorized') {
      await expect(page.getByRole('heading', { name: 'Project context' })).toBeVisible();
      await expect(page.getByText('Accessible denial fixture')).toHaveCount(0);
    } else {
      await expect(page.getByRole('heading', { name: 'Accessible denial fixture' })).toBeVisible();
      await expect(page.getByText(state, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Protected details appear only through an authorized mediated read.')).toBeVisible();
    await expect(page.getByRole('button', { name: /run|execute|save|approve|reject|create|transition/i })).toHaveCount(
      0,
    );

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toHaveCount(1);
    expect(await page.locator(':focus-visible').evaluate((element) => element.tagName)).toMatch(/^(A|BUTTON)$/);
  }
});

test('loading is a rendered accessible route state and denial remains guarded', async ({ page, request }) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const create = await page.request.post('/api/projects', { data: { name: 'Loading workspace fixture' } });

  expect(create.status()).toBe(201);
  const projectId = (await create.json()).data.id as string;

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'visible' });
  await page.route(`**/api/projects/${projectId}/workspace`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.continue();
  });
  await page.goto(`/app/en/projects/${projectId}/workspace`);

  const loadingStatus = page.getByRole('heading', { name: 'Loading project workspace' });

  await expect(loadingStatus).toBeVisible();
  await expect(loadingStatus.locator('..')).toHaveAttribute('aria-live', 'polite');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus-visible')).toHaveCount(1);
  expect(await page.locator(':focus-visible').evaluate((element) => element.tagName)).toMatch(/^(A|BUTTON)$/);
  await expect(page.getByText('Reading the protected operational projection…')).toBeVisible();
  await expect(page.getByText('Loading workspace fixture')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /run|execute|save|approve|reject|create|transition/i })).toHaveCount(0);

  for (const [size, width, height] of [
    ['mobile', 390, 844],
    ['tablet', 768, 1024],
    ['desktop', 1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(loadingStatus).toBeVisible();
      await expect(loadingStatus.locator('..')).toHaveAttribute('aria-live', 'polite');
      await expect(page.getByText('Reading the protected operational projection…')).toBeVisible();
      await expect(page).toHaveScreenshot(`state-loading-${size}-${colorScheme}.png`, { fullPage: true });
    }
  }

  await expect(page.getByRole('heading', { name: 'Loading project workspace' })).toBeHidden();

  await page.unroute(`**/api/projects/${projectId}/workspace`);
  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'unauthorized' });
  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('heading', { name: 'Project context' })).toBeVisible();
  await expect(page.getByText('Loading workspace fixture')).toHaveCount(0);
  await expect(page.getByText('Protected details appear only through an authorized mediated read.')).toBeVisible();
  await expect(page.getByRole('button', { name: /run|execute|save|approve|reject|create|transition/i })).toHaveCount(0);
});

test('workspace routes expose deep links and deterministic responsive read-only snapshots', async ({
  page,
  request,
}) => {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const create = await page.request.post('/api/projects', { data: { name: 'Workspace route snapshot fixture' } });

  expect(create.status()).toBe(201);
  const projectId = (await create.json()).data.id as string;

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'visible' });
  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('heading', { name: 'Workspace route snapshot fixture' })).toBeVisible();
  await expect(page.getByText('No execution or mutation controls are available.')).toBeVisible();

  for (const [name, width, height] of [
    ['mobile', 390, 844],
    ['tablet', 768, 1024],
    ['desktop', 1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page).toHaveScreenshot(`workspace-${name}-${colorScheme}.png`, { fullPage: true });
    }
  }

  const surfaces = [
    ['work-items/work-item-fixture', 'Work item inspection', 'detail'],
    ['validation', 'Validation and evidence', 'validation-evidence'],
    ['timeline', 'Timeline', 'timeline'],
    ['iterations/iteration-1', 'Iteration context', 'iteration'],
  ] as const;

  for (const [path, heading, name] of surfaces) {
    await page.goto(`/app/en/projects/${projectId}/${path}`);
    if (name === 'detail') {
      await expect(page.getByText('Work item · work-item-fixture')).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/read-only|Recorded|No iteration selected/i).first()).toBeVisible();
    for (const [size, width, height] of [
      ['mobile', 390, 844],
      ['tablet', 768, 1024],
      ['desktop', 1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await expect(page).toHaveScreenshot(`${name}-${size}-${colorScheme}.png`, { fullPage: true });
      }
    }
  }
  for (const lifecycle of ['draft', 'ready', 'in_progress', 'review', 'blocked', 'done'] as const) {
    await page.setExtraHTTPHeaders({
      'x-operational-workspace-state': 'visible',
      'x-operational-workspace-lifecycle': lifecycle,
    });
    await page.goto(`/app/en/projects/${projectId}/work-items/work-item-fixture`);
    await expect(page.getByRole('heading', { name: 'Protected work item' })).toBeVisible();
    if (lifecycle === 'review') {
      await expect(page.getByText('Independent review is pending.', { exact: true }).first()).toBeVisible();
    } else if (lifecycle === 'blocked') {
      await expect(
        page.getByText('Work is blocked: inspect the dependency or decision before continuing.'),
      ).toBeVisible();
    } else {
      await expect(page.getByText(new RegExp(`Recorded lifecycle state: ${lifecycle}`, 'i'))).toBeVisible();
    }
    await expect(page.getByText('The execution run is in progress.')).toBeVisible();
    await expect(page.getByText('Focused read-model and route validation recorded.')).toBeVisible();
  }
  for (const verdict of ['pending', 'accepted', 'rejected', 'rework'] as const) {
    await page.setExtraHTTPHeaders({
      'x-operational-workspace-state': 'visible',
      'x-operational-workspace-lifecycle': verdict,
    });
    await page.goto(`/app/en/projects/${projectId}/validation`);
    await expect(page.getByRole('heading', { name: 'Validation and evidence' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'verification · passed' })).toBeVisible();
    await expect(page.getByText(new RegExp(`${verdict}.*Independent reviewer`, 'i'))).toBeVisible();
  }

  const stateScreenshots = [
    ['execution-agent', 'work-items/work-item-fixture', 'in_progress', 'Protected work item'],
    ['evidence', 'validation', 'accepted', 'Validation and evidence'],
    ['review-pending', 'validation', 'pending', 'Validation and evidence'],
    ['accepted', 'validation', 'accepted', 'Validation and evidence'],
    ['rejected', 'validation', 'rejected', 'Validation and evidence'],
    ['rework', 'validation', 'rework', 'Validation and evidence'],
  ] as const;

  for (const [stateName, path, lifecycle, heading] of stateScreenshots) {
    await page.setExtraHTTPHeaders({
      'x-operational-workspace-state': 'visible',
      'x-operational-workspace-lifecycle': lifecycle,
    });
    await page.goto(`/app/en/projects/${projectId}/${path}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    if (stateName === 'execution-agent') {
      await expect(page.getByText('The execution run is in progress.')).toBeVisible();
    } else if (stateName === 'evidence') {
      await expect(page.getByText('Focused read-model and route validation recorded.')).toBeVisible();
    } else {
      await expect(page.getByText(new RegExp(`${lifecycle}.*Independent reviewer`, 'i'))).toBeVisible();
    }

    for (const [size, width, height] of [
      ['mobile', 390, 844],
      ['tablet', 768, 1024],
      ['desktop', 1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await expect(page).toHaveScreenshot(`state-${stateName}-${size}-${colorScheme}.png`, { fullPage: true });
      }
    }
  }

  for (const denial of ['unauthorized', 'locked', 'unavailable', 'error'] as const) {
    await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': denial });
    await page.goto(`/app/en/projects/${projectId}/workspace`);
    await expect(page.getByRole('main').last()).toBeVisible();
    await expect(page.getByText(denial, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Protected details appear only through an authorized mediated read.')).toBeVisible();

    for (const [size, width, height] of [
      ['mobile', 390, 844],
      ['tablet', 768, 1024],
      ['desktop', 1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await expect(page).toHaveScreenshot(`state-denial-${denial}-${size}-${colorScheme}.png`, { fullPage: true });
      }
    }
  }

  await page.setExtraHTTPHeaders({ 'x-operational-workspace-state': 'visible' });
  await page.goto(`/app/en/projects/${projectId}/work-items/missing-work-item`);
  await expect(page.getByRole('heading', { name: 'Work item unavailable' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /run project seed|create project|save|approve|reject|execute/i }),
  ).toHaveCount(0);
});
