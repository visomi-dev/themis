import type { FullConfig } from '@playwright/test';

import { startLocalAgentFixture, stopLocalAgentFixture } from './local-agent-fixture';

export default async function globalSetup(_config: FullConfig) {
  const fixture = await startLocalAgentFixture();

  return async () => stopLocalAgentFixture(fixture);
}
