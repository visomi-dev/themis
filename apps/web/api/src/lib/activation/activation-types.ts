type ActivationMilestone =
  | 'activation_completed'
  | 'activation_skipped'
  | 'api_key_created'
  | 'config_copied'
  | 'seed_prompt_copied';

type ActivationApiKey = {
  createdAt: string;
  id: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  tokenPrefix: string;
};

type ActivationState = {
  apiKeys: ActivationApiKey[];
  milestones: ActivationMilestone[];
  seedPrompt: string;
};

type CreatedApiKey = ActivationApiKey & {
  plaintextToken: string;
};

export type { ActivationApiKey, ActivationMilestone, ActivationState, CreatedApiKey };
