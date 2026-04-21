import { randomBytes, randomUUID } from 'node:crypto';

import { desc, eq } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config.js';
import { getDb } from '../db/client.js';
import { apiKeys, userActivationMilestones } from '../db/schema.js';
import { hashSecret } from '../auth/auth-crypto.js';
import { AuthError } from '../auth/auth-errors.js';

import type { ActivationApiKey, ActivationMilestone, ActivationState, CreatedApiKey } from './activation-types.js';

type ActivationMilestoneMetadata = Record<string, string | null>;

const ACTIVATION_MILESTONES = new Set<ActivationMilestone>([
  'activation_completed',
  'activation_skipped',
  'api_key_created',
  'config_copied',
  'seed_prompt_copied',
]);

const buildSeedPrompt = () => `Analyze this repository and prepare the initial project context for Themis.

Please:
1. Identify the app, framework, runtime, and package manager used.
2. Summarize the project architecture and major domains.
3. Detect the main dev, build, test, and lint commands.
4. List referenced environment variables and runtime assumptions.
5. Suggest the first 3 useful setup tasks inside Themis.

Return the result as a concise project setup summary suitable for storing as project context.`;

const mapApiKey = (record: typeof apiKeys.$inferSelect): ActivationApiKey => ({
  createdAt: record.createdAt.toISOString(),
  id: record.id,
  label: record.label,
  lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
  revokedAt: record.revokedAt?.toISOString() ?? null,
  tokenPrefix: record.tokenPrefix,
});

const createActivationService = (config: AuthConfig) => {
  const db = getDb(config);

  const getActivationState = async (userId: string): Promise<ActivationState> => {
    const keyRows = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));

    const milestoneRows = await db
      .select({ milestone: userActivationMilestones.milestone })
      .from(userActivationMilestones)
      .where(eq(userActivationMilestones.userId, userId))
      .orderBy(desc(userActivationMilestones.createdAt));

    return {
      apiKeys: keyRows.filter((row) => row.revokedAt === null).map(mapApiKey),
      milestones: [...new Set(milestoneRows.map((row) => row.milestone as ActivationMilestone))],
      seedPrompt: buildSeedPrompt(),
    };
  };

  const recordMilestone = async (
    userId: string,
    milestone: ActivationMilestone,
    metadata?: ActivationMilestoneMetadata,
  ) => {
    if (!ACTIVATION_MILESTONES.has(milestone)) {
      throw new AuthError(400, 'invalid_milestone', 'The activation milestone is not supported.');
    }

    await db.insert(userActivationMilestones).values({
      createdAt: new Date(),
      id: randomUUID(),
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      milestone,
      userId,
    });
  };

  const createApiKey = async (userId: string, label: string): Promise<CreatedApiKey> => {
    const normalizedLabel = label.trim();

    if (normalizedLabel.length === 0) {
      throw new AuthError(400, 'invalid_label', 'API key label is required.');
    }

    if (normalizedLabel.length > 80) {
      throw new AuthError(400, 'invalid_label', 'API key label must be 80 characters or fewer.');
    }

    const plaintextToken = `thm_${randomBytes(24).toString('base64url')}`;
    const now = new Date();
    const [createdKey] = await db
      .insert(apiKeys)
      .values({
        createdAt: now,
        id: randomUUID(),
        label: normalizedLabel,
        tokenHash: await hashSecret(plaintextToken),
        tokenPrefix: plaintextToken.slice(0, 12),
        updatedAt: now,
        userId,
      })
      .returning();

    await recordMilestone(userId, 'api_key_created', {
      apiKeyId: createdKey.id,
      label: createdKey.label,
    });

    return {
      ...mapApiKey(createdKey),
      plaintextToken,
    };
  };

  const revokeApiKey = async (userId: string, apiKeyId: string) => {
    const [existingKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, apiKeyId)).limit(1);

    if (!existingKey || existingKey.userId !== userId || existingKey.revokedAt) {
      throw new AuthError(404, 'api_key_not_found', 'The API key could not be found.');
    }

    await db
      .update(apiKeys)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, apiKeyId));
  };

  return {
    createApiKey,
    getActivationState,
    recordMilestone,
    revokeApiKey,
  };
};

export { createActivationService };
