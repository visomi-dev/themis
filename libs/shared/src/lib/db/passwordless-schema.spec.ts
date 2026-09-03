import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

type HarnessResult = {
  checks: string[];
};

describe('passwordless schema cutover', () => {
  let result: HarnessResult;

  beforeAll(() => {
    const output = execFileSync(
      process.execPath,
      ['--experimental-vm-modules', resolve(__dirname, 'passwordless-schema-harness.mjs')],
      { encoding: 'utf8', timeout: 60_000 },
    );

    result = JSON.parse(output) as HarnessResult;
  }, 65_000);

  it.each([
    'migration-history',
    'pre-user-email-challenge',
    'single-use-consumption',
    'concurrent-identity',
    'webauthn-context',
    'credential-uniqueness',
    'required-indexes',
  ])('passes the %s database check', (check) => {
    expect(result.checks).toContain(check);
  });
});
