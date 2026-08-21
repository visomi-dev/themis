import axios from 'axios';

const password = 'S3cureAuth!';

const cookieHeader = (setCookie: string[] | undefined) =>
  setCookie?.map((cookie) => cookie.split(';', 1)[0]).join('; ') ?? '';

const envelope = (
  workspaceId: string,
  envelopeId: string,
  revision: number,
  tombstone = false,
  recipientDeviceId?: string,
) => ({
  format: 'themis.encrypted-envelope',
  version: 1,
  kind: 'sync-object',
  envelopeId,
  workspaceId,
  recordType: tombstone ? 'tombstone' : 'project-context',
  revision,
  createdAt: '2026-08-20T00:00:00.000Z',
  associatedData: { purpose: 'sync' },
  metadata: recipientDeviceId ? { recipientDeviceId } : tombstone ? { deletedRecordId: 'record-1' } : {},
  nonce: `bm9uY2Ut${envelopeId}`,
  ciphertext: `c3ludGhlc2lzL${envelopeId}`,
  authTag: `dGFnL${envelopeId}`,
});

async function session(suffix: string): Promise<{ cookie: string; workspaceId: string; deviceId: string }> {
  const email = `sync-${suffix}-${Date.now()}@themis.dev`;
  const authenticated = await axios.post('/test/auth/session', { email, password });
  const cookie = cookieHeader(authenticated.headers['set-cookie']);
  const headers = { headers: { Cookie: cookie } };
  const project = await axios.post('/projects', { name: `Sync ${suffix}`, sourceType: 'manual' }, headers);
  const workspaceId = project.data.data.id as string;
  const ownerDevice = await axios.post(
    `/sync/${workspaceId}/devices`,
    { publicKey: `fixture-owner-public-${suffix}`, label: `Sync ${suffix} owner` },
    headers,
  );
  const ownerDeviceId = ownerDevice.data.data.deviceId as string;

  await axios.post(
    `/sync/${workspaceId}/devices/${ownerDeviceId}/approval`,
    { approverDeviceId: ownerDeviceId },
    headers,
  );
  const device = await axios.post(
    `/sync/${workspaceId}/devices`,
    { publicKey: `fixture-public-${suffix}`, label: `Sync ${suffix}` },
    headers,
  );
  const deviceId = device.data.data.deviceId as string;

  await axios.post(
    `/sync/${workspaceId}/devices/${deviceId}/enroll`,
    {
      approverDeviceId: ownerDeviceId,
      envelope: {
        ...envelope(workspaceId, `workspace-key-${suffix}`, 1),
        recordType: 'workspace-key-distribution',
        metadata: { recipientDeviceId: deviceId },
      },
    },
    headers,
  );

  return { cookie, workspaceId, deviceId };
}

describe('opaque sync HTTP boundary', () => {
  it('supports append, fetch, cursor pagination, queue flush, tombstones, reconnect, and authorization', async () => {
    const owner = await session('owner');
    const other = await session('other');
    const ownerHeaders = {
      headers: { Cookie: owner.cookie },
      validateStatus: () => true,
    };
    const otherHeaders = { headers: { Cookie: other.cookie }, validateStatus: () => true };
    const syncHeaders = {
      ...ownerHeaders,
      headers: { Cookie: owner.cookie },
    };
    const queued = envelope(owner.workspaceId, 'queued-1', 1);
    const flushed = envelope(owner.workspaceId, 'flushed-1', 2);
    const tombstone = envelope(owner.workspaceId, 'deleted-1', 3, true);

    const append = await axios.post(
      `/sync/${owner.workspaceId}/envelopes`,
      { envelope: queued, deviceId: owner.deviceId, enrollmentVersion: 1 },
      syncHeaders,
    );

    expect(append.status).toBe(201);
    expect(append.data.data.envelope.ciphertext).toBe(queued.ciphertext);

    const duplicate = await axios.post(
      `/sync/${owner.workspaceId}/envelopes`,
      { envelope: queued, deviceId: owner.deviceId, enrollmentVersion: 1 },
      syncHeaders,
    );

    expect(duplicate.status).toBe(200);
    expect(duplicate.data.data.duplicate).toBe(true);

    const flush = await axios.post(
      `/sync/${owner.workspaceId}/envelopes`,
      { envelope: flushed, deviceId: owner.deviceId, enrollmentVersion: 1 },
      syncHeaders,
    );

    expect(flush.status).toBe(201);

    const page = await axios.get(`/sync/${owner.workspaceId}/envelopes`, {
      ...ownerHeaders,
      params: { afterCursor: 0, limit: 1, deviceId: owner.deviceId, enrollmentVersion: 1 },
    });

    expect(page.data.data.envelopes).toHaveLength(1);
    const cursor = page.data.data.envelopes[0].cursor as number;

    const afterCursor = await axios.get(`/sync/${owner.workspaceId}/envelopes`, {
      ...ownerHeaders,
      params: { afterCursor: cursor, limit: 100, deviceId: owner.deviceId, enrollmentVersion: 1 },
    });

    expect(afterCursor.data.data.envelopes[0].envelope.envelopeId).toBe('flushed-1');

    const deleteAppend = await axios.post(
      `/sync/${owner.workspaceId}/envelopes`,
      { envelope: tombstone, deviceId: owner.deviceId, enrollmentVersion: 1 },
      syncHeaders,
    );

    expect(deleteAppend.status).toBe(201);
    const reconnect = await axios.get(`/sync/${owner.workspaceId}/envelopes`, {
      ...ownerHeaders,
      params: { afterCursor: 0, limit: 100, deviceId: owner.deviceId, enrollmentVersion: 1 },
    });

    expect(
      reconnect.data.data.envelopes.map((item: { envelope: { envelopeId: string } }) => item.envelope.envelopeId),
    ).toContain('deleted-1');
    expect(JSON.stringify(reconnect.data)).not.toContain('project plaintext');

    const unauthorized = await axios.get(`/sync/${owner.workspaceId}/envelopes`, {
      ...otherHeaders,
      params: { deviceId: other.deviceId, enrollmentVersion: 1 },
    });

    expect(unauthorized.status).toBe(404);
    expect(JSON.stringify(unauthorized.data)).not.toContain(queued.ciphertext);
  }, 30_000);
});
