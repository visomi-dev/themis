import { z } from '../shared/http/route-schemas';

import { encryptedEnvelopeSchema } from 'shared';

const opaqueSyncParamsSchema = z.object({ workspaceId: z.string().min(1).max(200) }).meta({ id: 'OpaqueSyncParams' });
const opaqueSyncQuerySchema = z
  .object({
    afterCursor: z.coerce.number().int().nonnegative().default(0),
    limit: z.coerce.number().int().min(1).max(100).default(100),
  })
  .meta({ id: 'OpaqueSyncQuery' });
const opaqueEnvelopeRequestSchema = z
  .object({
    envelope: encryptedEnvelopeSchema,
    deviceId: z.string().min(1),
    enrollmentVersion: z.number().int().positive(),
  })
  .meta({ id: 'OpaqueEnvelopeRequest' });
const opaqueEnvelopeSchema = z.object({ cursor: z.number().int().positive(), envelope: encryptedEnvelopeSchema });
const deviceParamsSchema = z.object({ deviceId: z.string().min(1).max(200) }).meta({ id: 'DeviceParams' });
const deviceRouteParamsSchema = opaqueSyncParamsSchema.merge(deviceParamsSchema);
const deviceCreateSchema = z.object({ publicKey: z.string().min(1), label: z.string().min(1).max(200) });
const deviceApprovalSchema = z.object({ approverDeviceId: z.string().min(1) });
const deviceEnrollmentSchema = z.object({ approverDeviceId: z.string().min(1), envelope: encryptedEnvelopeSchema });
const deviceRecoverySchema = z.object({
  lostDeviceId: z.string().min(1),
  replacementDeviceId: z.string().min(1),
  approverDeviceId: z.string().min(1),
  envelope: encryptedEnvelopeSchema,
});
const deviceSyncQuerySchema = z.object({
  deviceId: z.string().min(1),
  enrollmentVersion: z.coerce.number().int().positive(),
});

const opaqueSyncOpenApiPaths = {
  '/sync/{workspaceId}/envelopes': {
    get: {
      requestParams: { path: opaqueSyncParamsSchema, query: opaqueSyncQuerySchema },
      responses: { 200: { description: 'Opaque envelopes.' } },
    },
    post: {
      requestParams: { path: opaqueSyncParamsSchema },
      requestBody: { content: { 'application/json': { schema: opaqueEnvelopeRequestSchema } } },
      responses: { 201: { description: 'Opaque envelope accepted.' } },
    },
  },
};

export {
  opaqueEnvelopeRequestSchema,
  opaqueEnvelopeSchema,
  opaqueSyncOpenApiPaths,
  opaqueSyncParamsSchema,
  opaqueSyncQuerySchema,
  deviceApprovalSchema,
  deviceCreateSchema,
  deviceEnrollmentSchema,
  deviceParamsSchema,
  deviceRouteParamsSchema,
  deviceRecoverySchema,
  deviceSyncQuerySchema,
};
