export type CapabilityAudience = 'local-agent' | `mcp:${string}`;

export type CapabilityAction = 'read' | 'write' | 'execute' | 'use-secret' | 'delegate';

export type CapabilityScope = {
  accountId: string;
  workspaceId: string;
  projectId?: string;
  resourceId?: string;
  action: CapabilityAction;
};

export type Capability = {
  format: 'themis.capability';
  version: 1;
  id: string;
  issuer: 'local-agent';
  subject: string;
  audience: CapabilityAudience;
  scope: CapabilityScope;
  purpose: string;
  issuedAt: string;
  expiresAt: string;
  delegable: boolean;
  signature: string;
  issuerPublicKey?: string;
};

export type CapabilityRequest = {
  requestId: string;
  caller: string;
  audience: CapabilityAudience;
  scope: CapabilityScope;
  purpose: string;
  at?: Date;
};

export type CapabilityStatePersistence = {
  load: () => { revoked: readonly string[]; requests: readonly string[] };
  save: (state: { revoked: readonly string[]; requests: readonly string[] }) => void;
};

export type CapabilityDecision =
  | { allowed: true; capabilityId: string }
  | {
      allowed: false;
      reason:
        | 'malformed'
        | 'expired'
        | 'not-yet-valid'
        | 'revoked'
        | 'replayed'
        | 'subject-mismatch'
        | 'audience-mismatch'
        | 'purpose-mismatch'
        | 'scope-mismatch';
    };

function capabilityPayload(capability: Capability): string {
  const { signature: _signature, ...unsigned } = capability;

  return JSON.stringify(unsigned);
}

export function signCapability(capability: Capability, privateKey: KeyObject, issuerPublicKey: string): Capability {
  const unsigned = { ...capability, issuerPublicKey, signature: '' };

  return {
    ...unsigned,
    signature: sign(null, Buffer.from(capabilityPayload(unsigned)), privateKey).toString('base64url'),
  };
}

const sameScope = (capability: CapabilityScope, request: CapabilityScope): boolean =>
  capability.accountId === request.accountId &&
  capability.workspaceId === request.workspaceId &&
  capability.projectId === request.projectId &&
  capability.resourceId === request.resourceId &&
  capability.action === request.action;

const isCapability = (value: Capability): boolean =>
  value.format === 'themis.capability' &&
  value.version === 1 &&
  value.issuer === 'local-agent' &&
  value.id.length > 0 &&
  value.subject.length > 0 &&
  value.audience.length > 0 &&
  value.purpose.length > 0 &&
  value.signature.length > 0 &&
  typeof value.issuerPublicKey === 'string' &&
  value.issuerPublicKey.length > 0 &&
  !Number.isNaN(Date.parse(value.issuedAt)) &&
  !Number.isNaN(Date.parse(value.expiresAt)) &&
  Date.parse(value.expiresAt) > Date.parse(value.issuedAt) &&
  value.scope.accountId.length > 0 &&
  value.scope.workspaceId.length > 0;

/**
 * Evaluates already-issued capabilities at the local trust boundary.
 * The cloud/MCP transport may carry a capability, but only the local agent
 * decides whether it can be used. Revocation and request IDs are process
 * state here; durable storage and cryptographic encoding remain open.
 */
export class CapabilityPolicy {
  private readonly revoked: Set<string>;
  private readonly requests: Set<string>;

  public constructor(private readonly persistence?: CapabilityStatePersistence) {
    const state = persistence?.load();

    this.revoked = new Set(state?.revoked ?? []);
    this.requests = new Set(state?.requests ?? []);
  }

  private persist(): void {
    this.persistence?.save({ revoked: [...this.revoked], requests: [...this.requests] });
  }

  revoke(capabilityId: string): void {
    this.revoked.add(capabilityId);
    this.persist();
  }

  evaluate(capability: Capability, request: CapabilityRequest): CapabilityDecision {
    if (!isCapability(capability)) return { allowed: false, reason: 'malformed' };

    let signatureValid: boolean;

    try {
      signatureValid = verify(
        null,
        Buffer.from(capabilityPayload(capability)),
        createPublicKey({
          key: Buffer.from(capability.issuerPublicKey ?? '', 'base64url'),
          format: 'der',
          type: 'spki',
        }),
        Buffer.from(capability.signature, 'base64url'),
      );
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) return { allowed: false, reason: 'malformed' };

    const now = (request.at ?? new Date()).getTime();
    const issuedAt = Date.parse(capability.issuedAt);
    const expiresAt = Date.parse(capability.expiresAt);

    if (now < issuedAt) return { allowed: false, reason: 'not-yet-valid' };

    if (now >= expiresAt) return { allowed: false, reason: 'expired' };

    if (this.revoked.has(capability.id)) return { allowed: false, reason: 'revoked' };

    if (this.requests.has(request.requestId)) return { allowed: false, reason: 'replayed' };

    if (capability.subject !== request.caller) return { allowed: false, reason: 'subject-mismatch' };

    if (capability.audience !== request.audience) return { allowed: false, reason: 'audience-mismatch' };

    if (capability.purpose !== request.purpose) return { allowed: false, reason: 'purpose-mismatch' };

    if (!sameScope(capability.scope, request.scope)) return { allowed: false, reason: 'scope-mismatch' };

    this.requests.add(request.requestId);
    this.persist();

    return { allowed: true, capabilityId: capability.id };
  }
}
import { createPublicKey, sign, verify, type KeyObject } from 'node:crypto';
