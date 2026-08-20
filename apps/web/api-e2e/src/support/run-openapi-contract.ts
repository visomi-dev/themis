import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { waitForPortOpen } from '@nx/node/utils';

const host = process.env.HOST ?? 'localhost';
const port = Number(process.env.GATEWAY_PORT ?? 8083);
const baseUrl = `http://${host}:${port}`;
const apiUrl = `${baseUrl}/api`;
const schemaUrl = `${apiUrl}/openapi.json`;
const reportDirectory = resolve(process.cwd(), 'dist/test-results/api-e2e/openapi');
const serverEntryPoint = resolve(process.cwd(), 'dist/apps/web/server/main.js');
const pidPath = resolve(process.cwd(), 'apps/web/api-e2e/.api-e2e-openapi-server.pid');
const phases = process.env.SCHEMATHESIS_PHASES ?? 'examples,coverage';
let activeServerPid: number | undefined;

type ChallengeResponse = {
  data?: {
    challengeId?: string;
  };
};

async function bootstrapSession(): Promise<string> {
  const email = `openapi-${Date.now()}@themis.dev`;
  const password = 'S3cureOpenApi!';

  await fetch(`${apiUrl}/test/mailbox`, { method: 'DELETE' });

  const signUp = await fetch(`${apiUrl}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!signUp.ok) throw new Error(`OpenAPI contract bootstrap sign-up failed with ${signUp.status}.`);

  const signUpBody = (await signUp.json()) as ChallengeResponse;
  const challengeId = signUpBody.data?.challengeId;

  if (!challengeId) throw new Error('OpenAPI contract bootstrap did not return a sign-up challenge.');

  const mailbox = await fetch(`${apiUrl}/test/mailbox/latest?email=${encodeURIComponent(email)}&purpose=sign_up`);
  const mailboxBody = (await mailbox.json()) as { pin?: string };

  if (!mailboxBody.pin) throw new Error('OpenAPI contract bootstrap did not return a verification PIN.');

  const verify = await fetch(`${apiUrl}/auth/sign-up/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, pin: mailboxBody.pin }),
  });

  if (!verify.ok) throw new Error(`OpenAPI contract bootstrap verification failed with ${verify.status}.`);

  const headers = verify.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() ?? [headers.get('set-cookie') ?? ''];

  if (setCookies.every((cookie) => cookie.length === 0))
    throw new Error('OpenAPI contract bootstrap did not return a session cookie.');

  return setCookies
    .filter((cookie) => cookie.length > 0)
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
}

function stopServer(pid: number): void {
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== 'ESRCH') {
      console.error('Failed to stop the OpenAPI contract test server.', error);
    }
  }
}

async function run(): Promise<number> {
  await mkdir(reportDirectory, { recursive: true });

  const server = spawn(process.execPath, [serverEntryPoint], {
    detached: true,
    env: {
      ...process.env,
      COOKIE_SECURE: 'false',
      DATABASE_AUTO_MIGRATE: 'true',
      DATABASE_DRIVER: 'memory',
      ENABLE_TEST_API: 'true',
      HOST: host,
      GATEWAY_PORT: String(port),
      MAIL_TRANSPORT: 'memory',
      NG_ALLOWED_HOSTS: host,
      NODE_ENV: 'test',
      PIN_RESEND_COOLDOWN_SECONDS: phases.includes('fuzzing') ? '0' : process.env['PIN_RESEND_COOLDOWN_SECONDS'],
      PORT: String(port),
      SESSION_SECRET: 'themis-api-openapi-e2e-secret',
    },
    stdio: 'inherit',
  });

  if (server.pid == null) {
    throw new Error('Failed to start composition server for OpenAPI contract tests.');
  }

  activeServerPid = server.pid;
  await writeFile(pidPath, String(server.pid));

  try {
    await waitForPortOpen(port, { host });
    await waitForHealth(baseUrl);
    const sessionCookie = await bootstrapSession();

    const result = await new Promise<number>((resolveResult, reject) => {
      const contract = spawn(
        'uvx',
        [
          '--from',
          'schemathesis==4.24.3',
          'schemathesis',
          'run',
          schemaUrl,
          '--url',
          apiUrl,
          '--header',
          `Cookie: ${sessionCookie}`,
          '--exclude-path-regex',
          '^/test/',
          '--phases',
          phases,
          '--workers',
          '1',
          '--mode',
          'all',
          '--generation-deterministic',
          '--seed',
          '20260818',
          '--max-examples',
          '5',
          '--max-failures',
          '20',
          '--request-timeout',
          '5',
          '--max-response-time',
          '5',
          '--continue-on-failure',
          '--report',
          'junit,har',
          '--report-dir',
          reportDirectory,
          '--output-sanitize',
          'true',
          '--wait-for-schema',
          '30',
        ],
        { stdio: 'inherit' },
      );

      contract.once('error', reject);

      contract.once('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`Schemathesis exited due to signal ${signal}.`));

          return;
        }

        resolveResult(code ?? 1);
      });
    });

    return result;
  } finally {
    stopServer(server.pid);
    activeServerPid = undefined;
    await rm(pidPath, { force: true });
  }
}

async function waitForHealth(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(1000) });

      if (response.ok) return;
    } catch {
      // A listener can accept TCP before the gateway is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Gateway health check did not become ready at ${baseUrl}/healthz.`);
}

async function handleSignal(code: number): Promise<void> {
  if (activeServerPid !== undefined) stopServer(activeServerPid);
  await rm(pidPath, { force: true });
  process.exit(code);
}

process.once('SIGINT', () => void handleSignal(130));
process.once('SIGTERM', () => void handleSignal(143));

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
