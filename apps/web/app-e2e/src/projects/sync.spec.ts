import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

import { createCredentials } from '../support/auth';

test.setTimeout(120_000);

type Session = { accountId: string; userId: string };
type Device = { deviceId: string; enrollmentVersion: number };
type CryptoProfile = { keyId: string; keyFingerprint: string };

const password = 'S3cureAuth!';

function opaqueEnvelope(workspaceId: string, envelopeId: string, revision: number, recipientDeviceId?: string) {
  return {
    format: 'themis.encrypted-envelope',
    version: 1,
    kind: 'sync-object',
    envelopeId,
    workspaceId,
    recordType: 'project-context',
    revision,
    createdAt: '2026-08-24T00:00:00.000Z',
    associatedData: { purpose: 'app-e2e-sync' },
    metadata: recipientDeviceId ? { recipientDeviceId } : {},
    nonce: `YXBwLWUyLW5vbmNl-${envelopeId}`,
    ciphertext: `YXBwLWUyLWNpcGhlcnRleHQt${envelopeId}`,
    authTag: `YXBwLWUyLXRhZy-${envelopeId}`,
  };
}

/** Creates a non-exportable key in the context-local IndexedDB vault. Only its
 * public identity is returned; the key and plaintext never leave the context. */
async function createContextEnvelope(
  page: Page,
  workspaceId: string,
  envelopeId: string,
  revision: number,
  recipientDeviceId?: string,
): Promise<{ envelope: ReturnType<typeof opaqueEnvelope>; profile: CryptoProfile }> {
  return page.evaluate(
    async ({
      workspaceId: currentWorkspaceId,
      envelopeId: currentEnvelopeId,
      revision: currentRevision,
      recipient,
    }) => {
      const encode = (bytes: Uint8Array): string => {
        let binary = '';

        for (const byte of bytes) binary += String.fromCharCode(byte);

        return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
      };
      const keyIdBytes = crypto.getRandomValues(new Uint8Array(16));

      const keyId = encode(keyIdBytes);
      const fingerprint = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', keyIdBytes)));
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('themis-sync-local-vault', 1);

        request.onupgradeneeded = () => request.result.createObjectStore('device-keys', { keyPath: 'keyId' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        const request = database.transaction('device-keys', 'readwrite').objectStore('device-keys').put({
          keyId,
          keyFingerprint: fingerprint,
          key,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = new Uint8Array(
        await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: nonce },
          key,
          new TextEncoder().encode(`opaque-sync:${currentWorkspaceId}:${currentEnvelopeId}`),
        ),
      );
      const tagLength = 16;
      const metadata = {
        ...(recipient ? { recipientDeviceId: recipient } : {}),
        keyId,
        keyFingerprint: fingerprint,
      };

      return {
        profile: { keyId, keyFingerprint: fingerprint },
        envelope: {
          format: 'themis.encrypted-envelope' as const,
          version: 1 as const,
          kind: 'sync-object' as const,
          envelopeId: currentEnvelopeId,
          workspaceId: currentWorkspaceId,
          recordType: 'project-context',
          revision: currentRevision,
          createdAt: '2026-08-24T00:00:00.000Z',
          associatedData: { purpose: 'app-e2e-sync', keyFingerprint: fingerprint },
          metadata,
          nonce: encode(nonce),
          ciphertext: encode(encrypted.slice(0, -tagLength)),
          authTag: encode(encrypted.slice(-tagLength)),
        },
      };
    },
    { workspaceId, envelopeId, revision, recipient: recipientDeviceId },
  );
}

async function inspectContextKeyStore(
  page: Page,
): Promise<{ keyIds: string[]; nonExportableKeys: number; disclosedSecrets: string[] }> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('themis-sync-local-vault', 1);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<Array<{ keyId: string; keyFingerprint: string; key: CryptoKey }>>(
      (resolve, reject) => {
        const request = database.transaction('device-keys', 'readonly').objectStore('device-keys').getAll();

        request.onsuccess = () =>
          resolve(request.result as Array<{ keyId: string; keyFingerprint: string; key: CryptoKey }>);
        request.onerror = () => reject(request.error);
      },
    );
    const localState = `${localStorage.getItem('themis.sync.device') ?? ''}${localStorage.getItem('themis.sync.queue') ?? ''}`;

    return {
      keyIds: records.map(({ keyId }) => keyId),
      nonExportableKeys: records.filter(({ key }) => key instanceof CryptoKey && !key.extractable).length,
      disclosedSecrets: /privateKey|rawKey|secretKey|workspaceKey/i.test(localState) ? ['localStorage'] : [],
    };
  });
}

async function createSession(page: Page, suffix: string, accountId?: string): Promise<Session> {
  if (page.url() === 'about:blank') await page.goto('/app/en/auth/identity');
  const credentials = createCredentials();
  const separator = credentials.email.indexOf('@');
  const email = `${credentials.email.slice(0, separator)}-${suffix}${credentials.email.slice(separator)}`;
  const response = await page.request.post('/api/test/auth/session', {
    data: { email, password, ...(accountId ? { accountId } : {}) },
  });

  expect(response.status()).toBe(200);
  const origin = new URL(page.url()).origin;
  const cookies = response
    .headers()
    ['set-cookie'].split(/, (?=[^;]+=)/)
    .map((cookie) => cookie.split(';', 1)[0].split('='))
    .map(([name, ...value]) => ({ name, value: value.join('='), url: origin }));

  await page.context().addCookies([...cookies, { name: 'themis.hasSession', value: '1', url: origin }]);
  await page.goto('/app/en/activation');
  const skip = page.getByRole('button', { name: /Skip for now/i });

  if (await skip.isVisible().catch(() => false)) await skip.click();

  return (await response.json()).data as Session;
}

async function bindLocalDeviceState(context: BrowserContext, deviceId: string, client: 'web-only' | 'themis-agent') {
  await context.pages()[0].evaluate(
    ({ deviceId: currentDeviceId, client: currentClient }) => {
      localStorage.setItem(
        'themis.sync.device',
        JSON.stringify({
          deviceId: currentDeviceId,
          client: currentClient,
          keyEnvelopeRef: `local:${currentDeviceId}`,
        }),
      );
      localStorage.setItem('themis.sync.queue', JSON.stringify([]));
    },
    { deviceId, client },
  );
}

async function queueWhileOffline(
  page: Page,
  workspaceId: string,
  device: Device,
  value: ReturnType<typeof opaqueEnvelope>,
) {
  return page.evaluate(
    async ({ workspaceId: currentWorkspaceId, deviceId, enrollmentVersion, envelope }) => {
      try {
        await fetch(`/api/sync/${currentWorkspaceId}/envelopes`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ envelope, deviceId, enrollmentVersion }),
        });

        return 'sent';
      } catch {
        localStorage.setItem('themis.sync.queue', JSON.stringify([envelope]));

        return 'queued';
      }
    },
    { workspaceId, deviceId: device.deviceId, enrollmentVersion: device.enrollmentVersion, envelope: value },
  );
}

async function flushQueuedEnvelope(
  page: Page,
  workspaceId: string,
  device: Device,
  envelope: ReturnType<typeof opaqueEnvelope>,
): Promise<number> {
  return page.evaluate(
    async ({ workspaceId: currentWorkspaceId, deviceId, enrollmentVersion, envelope: queuedEnvelope }) => {
      const response = await fetch(`/api/sync/${currentWorkspaceId}/envelopes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ envelope: queuedEnvelope, deviceId, enrollmentVersion }),
      });

      localStorage.setItem('themis.sync.queue', JSON.stringify([]));

      return response.status;
    },
    { workspaceId, deviceId: device.deviceId, enrollmentVersion: device.enrollmentVersion, envelope },
  );
}

async function createDevice(request: APIRequestContext, workspaceId: string, label: string): Promise<Device> {
  const response = await request.post(`/api/sync/${workspaceId}/devices`, {
    data: { publicKey: `app-e2e-${label}-${Date.now()}`, label },
  });

  expect(response.status()).toBe(200);

  return { deviceId: (await response.json()).data.deviceId as string, enrollmentVersion: 1 };
}

async function enrollDevice(
  request: APIRequestContext,
  workspaceId: string,
  deviceId: string,
  approverDeviceId: string,
  envelopeId: string,
): Promise<Device> {
  const response = await request.post(`/api/sync/${workspaceId}/devices/${deviceId}/enroll`, {
    data: {
      approverDeviceId,
      envelope: {
        ...opaqueEnvelope(workspaceId, envelopeId, 1, deviceId),
        recordType: 'workspace-key-distribution',
      },
    },
  });

  expect(response.status()).toBe(200);

  return { deviceId, enrollmentVersion: (await response.json()).data.enrollmentVersion as number };
}

async function openWorkspace(page: Page, projectId: string, projectName: string): Promise<void> {
  await page.goto(`/app/en/projects/${projectId}/workspace`);
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  await expect(page.getByText('No execution or mutation controls are available.')).toBeVisible();
}

test('real route/API integration shares a workspace across two users and two devices', async ({ browser, page }) => {
  await page.context().addInitScript(() => localStorage.setItem('themis.sync.client', 'web-only'));
  const owner = await createSession(page, 'owner');
  const projectResponse = await page.request.post('/api/projects', {
    data: { name: 'Two-user encrypted workspace', sourceType: 'manual' },
  });

  expect(projectResponse.status()).toBe(201);
  const projectId = (await projectResponse.json()).data.id as string;

  const ownerDevice = await createDevice(page.request, projectId, 'owner-device');

  expect(
    (
      await page.request.post(`/api/sync/${projectId}/devices/${ownerDevice.deviceId}/approval`, {
        data: { approverDeviceId: ownerDevice.deviceId },
      })
    ).status(),
  ).toBe(200);
  const ownerGrant = await enrollDevice(
    page.request,
    projectId,
    ownerDevice.deviceId,
    ownerDevice.deviceId,
    'owner-workspace-key',
  );

  const memberContext = await browser.newContext({ baseURL: process.env['BASE_URL'] });

  await memberContext.addInitScript(() => localStorage.setItem('themis.sync.client', 'themis-agent'));
  const memberPage = await memberContext.newPage();

  try {
    const member = await createSession(memberPage, 'member', owner.accountId);

    expect(member.userId).not.toBe(owner.userId);
    const memberDevice = await createDevice(memberPage.request, projectId, 'member-device');
    const enrolledMember = await enrollDevice(
      page.request,
      projectId,
      memberDevice.deviceId,
      ownerDevice.deviceId,
      'member-workspace-key',
    );

    await bindLocalDeviceState(page.context(), ownerDevice.deviceId, 'web-only');
    await bindLocalDeviceState(memberContext, enrolledMember.deviceId, 'themis-agent');
    const ownerState = await page.context().storageState();
    const memberState = await memberContext.storageState();

    expect(ownerState.cookies).not.toEqual(memberState.cookies);
    expect(await page.evaluate(() => localStorage.getItem('themis.sync.device'))).toContain(ownerDevice.deviceId);
    expect(await memberPage.evaluate(() => localStorage.getItem('themis.sync.device'))).toContain(
      enrolledMember.deviceId,
    );

    const ownerEnvelope = await createContextEnvelope(page, projectId, 'shared-route-envelope', 1);
    const memberEnvelope = await createContextEnvelope(memberPage, projectId, 'offline-member-edit', 1);

    expect(ownerEnvelope.profile.keyId).not.toBe(memberEnvelope.profile.keyId);
    expect(ownerEnvelope.profile.keyFingerprint).not.toBe(memberEnvelope.profile.keyFingerprint);
    expect(ownerEnvelope.envelope.ciphertext).not.toBe(memberEnvelope.envelope.ciphertext);
    expect(ownerEnvelope.envelope.metadata.keyId).not.toBe(memberEnvelope.envelope.metadata.keyId);
    expect(JSON.stringify([ownerEnvelope.envelope, memberEnvelope.envelope])).not.toContain('opaque-sync:');
    expect(JSON.stringify([ownerEnvelope.envelope, memberEnvelope.envelope])).not.toMatch(
      /CryptoKey|rawKey|privateKey/,
    );
    expect(await inspectContextKeyStore(page)).toMatchObject({ nonExportableKeys: 1, disclosedSecrets: [] });
    expect(await inspectContextKeyStore(memberPage)).toMatchObject({ nonExportableKeys: 1, disclosedSecrets: [] });

    const sharedEnvelope = ownerEnvelope.envelope;
    const append = await page.request.post(`/api/sync/${projectId}/envelopes`, {
      data: {
        envelope: sharedEnvelope,
        deviceId: ownerDevice.deviceId,
        enrollmentVersion: ownerGrant.enrollmentVersion,
      },
    });

    expect(append.status()).toBe(201);

    const memberFetch = await memberPage.request.get(`/api/sync/${projectId}/envelopes`, {
      params: { deviceId: enrolledMember.deviceId, enrollmentVersion: enrolledMember.enrollmentVersion },
    });

    expect(memberFetch.status()).toBe(200);
    expect((await memberFetch.json()).data.envelopes[0].envelope.envelopeId).toBe(sharedEnvelope.envelopeId);

    const offlineEnvelope = memberEnvelope.envelope;

    await memberContext.setOffline(true);
    expect(await queueWhileOffline(memberPage, projectId, enrolledMember, offlineEnvelope)).toBe('queued');
    expect(await memberPage.evaluate(() => localStorage.getItem('themis.sync.queue'))).toContain(
      offlineEnvelope.envelopeId,
    );
    await memberContext.setOffline(false);
    expect(await flushQueuedEnvelope(memberPage, projectId, enrolledMember, offlineEnvelope)).toBe(201);

    const conflictEnvelope = opaqueEnvelope(projectId, 'same-record-conflict', 1);

    expect(
      (
        await page.request.post(`/api/sync/${projectId}/envelopes`, {
          data: {
            envelope: conflictEnvelope,
            deviceId: ownerDevice.deviceId,
            enrollmentVersion: ownerGrant.enrollmentVersion,
          },
        })
      ).status(),
    ).toBe(201);
    const memberConflict = opaqueEnvelope(projectId, conflictEnvelope.envelopeId, 2);

    expect(await flushQueuedEnvelope(memberPage, projectId, enrolledMember, memberConflict)).toBe(201);
    const [ownerConvergence, memberConvergence] = await Promise.all([
      page.request.get(`/api/sync/${projectId}/envelopes`, {
        params: { deviceId: ownerDevice.deviceId, enrollmentVersion: ownerGrant.enrollmentVersion },
      }),
      memberPage.request.get(`/api/sync/${projectId}/envelopes`, {
        params: { deviceId: enrolledMember.deviceId, enrollmentVersion: enrolledMember.enrollmentVersion },
      }),
    ]);

    expect(
      (await ownerConvergence.json()).data.envelopes.map(
        (entry: { envelope: { envelopeId: string } }) => entry.envelope.envelopeId,
      ),
    ).toEqual(
      (await memberConvergence.json()).data.envelopes.map(
        (entry: { envelope: { envelopeId: string } }) => entry.envelope.envelopeId,
      ),
    );

    await openWorkspace(page, projectId, 'Two-user encrypted workspace');
    await openWorkspace(memberPage, projectId, 'Two-user encrypted workspace');

    const bridgeResponses: Array<{ url: string; status: number }> = [];

    memberPage.on('response', (response) => {
      if (response.url().includes('/v1/local-agent/')) {
        bridgeResponses.push({ url: response.url(), status: response.status() });
      }
    });
    await memberPage.getByLabel('Projection source').selectOption('local-agent');
    const bridgePayload = await memberPage.evaluate(async (workspaceId) => {
      const response = await fetch(`/v1/local-agent/projections/${workspaceId}`, {
        headers: { 'x-themis-bridge-capabilities': 'projection', 'x-themis-bridge-version': '1' },
      });

      return {
        status: response.status,
        body: (await response.json()) as { projection: { work: Array<{ title: string }> } },
      };
    }, projectId);

    expect(bridgePayload.status).toBe(200);
    expect(bridgePayload.body.projection.work[0]?.title).toBe('Resolved local change');
    expect(bridgeResponses).toEqual([
      { url: expect.stringContaining(`/v1/local-agent/projections/${projectId}`), status: 200 },
    ]);

    const evidenceDir = path.join(workspaceRoot, 'playwright-report/agent-bridge');

    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      path.join(evidenceDir, 'two-context-flow.json'),
      JSON.stringify(
        {
          flow: 'web-only-owner-to-themis-agent-member',
          users: { owner: owner.userId, member: member.userId },
          devices: { owner: ownerDevice.deviceId, member: enrolledMember.deviceId },
          keyMaterial: 'context-local non-exportable keys; identifiers only',
          bridgeResponses,
          projection: 'resolved local change',
        },
        null,
        2,
      ),
    );
  } finally {
    await memberContext.close();
  }
});

test('real route/API integration enforces recovery quorum, all-device loss, re-enrollment, and stale denial', async ({
  page,
}) => {
  await createSession(page, 'recovery-owner');
  const projectResponse = await page.request.post('/api/projects', {
    data: { name: 'Recovery lifecycle workspace', sourceType: 'manual' },
  });

  expect(projectResponse.status()).toBe(201);
  const workspaceId = (await projectResponse.json()).data.id as string;
  const owner = await createDevice(page.request, workspaceId, 'recovery-owner-device');

  expect(
    (
      await page.request.post(`/api/sync/${workspaceId}/devices/${owner.deviceId}/approval`, {
        data: { approverDeviceId: owner.deviceId },
      })
    ).status(),
  ).toBe(200);
  const quorum = await createDevice(page.request, workspaceId, 'recovery-quorum-device');
  const enrolledQuorum = await enrollDevice(page.request, workspaceId, quorum.deviceId, owner.deviceId, 'quorum-key');
  const replacement = await createDevice(page.request, workspaceId, 'replacement-device');

  const recovery = await page.request.post(`/api/sync/${workspaceId}/devices/recover`, {
    data: {
      lostDeviceId: owner.deviceId,
      replacementDeviceId: replacement.deviceId,
      approverDeviceIds: [enrolledQuorum.deviceId, owner.deviceId],
      allDeviceLoss: false,
      envelope: {
        ...opaqueEnvelope(workspaceId, 'replacement-key', 1, replacement.deviceId),
        recordType: 'workspace-key-distribution',
      },
    },
  });

  const recoveryBody = await recovery.json();

  expect(recovery.status(), JSON.stringify(recoveryBody)).toBe(200);
  const replacementVersion = recoveryBody.data.enrollmentVersion as number;

  expect(
    (
      await page.request.post(`/api/sync/${workspaceId}/envelopes`, {
        data: {
          envelope: opaqueEnvelope(workspaceId, 'replacement-record', 1),
          deviceId: replacement.deviceId,
          enrollmentVersion: replacementVersion,
        },
      })
    ).status(),
  ).toBe(201);

  for (const deviceId of [owner.deviceId, enrolledQuorum.deviceId, replacement.deviceId]) {
    expect((await page.request.post(`/api/sync/${workspaceId}/devices/${deviceId}/revoke`)).status()).toBe(200);
  }

  const allLossReplacement = await createDevice(page.request, workspaceId, 'all-loss-replacement');
  const allLoss = await page.request.post(`/api/sync/${workspaceId}/devices/recover`, {
    data: {
      lostDeviceId: replacement.deviceId,
      replacementDeviceId: allLossReplacement.deviceId,
      approverDeviceIds: [owner.deviceId, enrolledQuorum.deviceId],
      allDeviceLoss: true,
      envelope: {
        ...opaqueEnvelope(workspaceId, 'all-device-loss-key', 1, allLossReplacement.deviceId),
        recordType: 'workspace-key-distribution',
      },
    },
  });

  expect(allLoss.status()).toBe(200);
  const allLossVersion = (await allLoss.json()).data.enrollmentVersion as number;

  const postLossApprover = await createDevice(page.request, workspaceId, 'post-loss-approver');
  const enrolledPostLossApprover = await enrollDevice(
    page.request,
    workspaceId,
    postLossApprover.deviceId,
    allLossReplacement.deviceId,
    'post-loss-approver-key',
  );
  const postLossDevice = await createDevice(page.request, workspaceId, 'post-loss-re-enrollment');
  const reEnrollment = await page.request.post(`/api/sync/${workspaceId}/devices/recover`, {
    data: {
      lostDeviceId: replacement.deviceId,
      replacementDeviceId: postLossDevice.deviceId,
      approverDeviceIds: [allLossReplacement.deviceId, enrolledPostLossApprover.deviceId],
      allDeviceLoss: false,
      envelope: {
        ...opaqueEnvelope(workspaceId, 'post-loss-re-enrollment-key', 1, postLossDevice.deviceId),
        recordType: 'workspace-key-distribution',
      },
    },
  });

  expect(reEnrollment.status()).toBe(200);
  expect((await reEnrollment.json()).data.enrollmentVersion).toBeGreaterThan(allLossVersion);

  const stale = await page.request.get(`/api/sync/${workspaceId}/envelopes`, {
    params: { deviceId: replacement.deviceId, enrollmentVersion: replacementVersion },
  });

  expect(stale.status()).toBe(409);
  await openWorkspace(page, workspaceId, 'Recovery lifecycle workspace');
});
