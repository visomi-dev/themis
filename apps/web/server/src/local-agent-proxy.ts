import { createPublicKey, createHash, type KeyObject } from 'node:crypto';

import type { RequestHandler } from 'express';

import {
  createLocalAgentChallenge,
  handshakeReplayKey,
  verifyLocalAgentHandshake,
  type LocalAgentHandshakeResponse,
} from 'shared';

type ReplayStore = {
  claim(key: string): Promise<boolean>;
};

type LocalAgentProxyOptions = {
  publicKey: KeyObject;
  target: URL;
  replayStore: ReplayStore;
  fetchImpl?: typeof fetch;
};

function sessionBinding(req: { headers: Record<string, string | string[] | undefined> }): string {
  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';

  return createHash('sha256').update(cookie).digest('base64url');
}

function createLocalAgentProxy({
  publicKey,
  target,
  replayStore,
  fetchImpl = fetch,
}: LocalAgentProxyOptions): RequestHandler {
  return async (req, res) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : `${req.protocol}://${req.get('host')}`;
    const challenge = createLocalAgentChallenge(origin, sessionBinding(req));
    const upstream = new URL(
      `${target.toString().replace(/\/$/, '')}${req.originalUrl.replace(/^\/v1\/product-visibility/, '')}`,
    );

    try {
      const upstreamResponse = await fetchImpl(upstream, {
        headers: {
          accept: 'application/json',
          cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : '',
          'x-themis-handshake-challenge': Buffer.from(JSON.stringify(challenge), 'utf8').toString('base64url'),
        },
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const responseHeader = upstreamResponse.headers.get('x-themis-handshake-response');

      if (!upstreamResponse.ok || !responseHeader) {
        res.status(upstreamResponse.status === 401 || upstreamResponse.status === 403 ? 403 : 503).json({
          code: 'local_agent_handshake_failed',
          message: 'The local agent did not authenticate the visibility request.',
        });

        return;
      }

      const response = JSON.parse(
        Buffer.from(responseHeader, 'base64url').toString('utf8'),
      ) as LocalAgentHandshakeResponse;

      if (
        !verifyLocalAgentHandshake(challenge, response, publicKey) ||
        !(await replayStore.claim(handshakeReplayKey(response)))
      ) {
        res
          .status(403)
          .json({ code: 'local_agent_handshake_failed', message: 'The local agent handshake was rejected.' });

        return;
      }

      res
        .status(200)
        .type('application/json')
        .send(await upstreamResponse.text());
    } catch {
      res.status(503).json({ code: 'local_agent_unavailable', message: 'The local agent is unavailable.' });
    }
  };
}

function publicKeyFromPem(pem: string | undefined): KeyObject | undefined {
  return pem ? createPublicKey(pem) : undefined;
}

export { createLocalAgentProxy, publicKeyFromPem };
export type { ReplayStore };
