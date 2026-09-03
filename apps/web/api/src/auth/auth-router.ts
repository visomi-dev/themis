import { Router, type CookieOptions, type Request } from 'express';

import { env } from '../shared/env';
import { getValidated, validateRequest } from '../shared/http/route-schemas';

import { clientContextHash, requestEmailOtp, resendEmailOtp, verifyEmailOtp } from './auth-service';
import {
  authOpenApiPaths,
  emailOtpFlowSchema,
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  restrictedAccountSelectionSchema,
} from './auth-schemas';
import { csrfProtection, emailOtpDeliveryRateLimit, emailOtpVerificationRateLimit } from './passkey-security';

import { HttpError, httpResponse } from 'shared';

const router = Router();
const SESSION_HINT_COOKIE = 'themis.hasSession';
const RESTRICTED_SESSION_MAX_AGE_MS = 15 * 60_000;

function requestContext(req: Request): string {
  return clientContextHash(req.ip, req.get('user-agent'));
}

function sessionHintCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: false,
    maxAge: maxAgeMs,
    path: '/',
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
  };
}

function clearSessionHintCookie(res: Parameters<typeof httpResponse.json>[0]): void {
  res.clearCookie(SESSION_HINT_COOKIE, sessionHintCookieOptions(0));
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

router.get('/session', function sessionHandler(req, res) {
  if (req.isAuthenticated() && req.user) {
    httpResponse.json(res, {
      data: { authenticated: true as const, kind: 'full' as const, user: req.user },
      message: 'Session retrieved.',
    });

    return;
  }

  const restricted = req.session?.restrictedAuth;

  if (restricted && restricted.expiresAt > Date.now()) {
    httpResponse.json(res, {
      data: {
        kind: 'restricted' as const,
        authenticated: false as const,
        expiresAt: new Date(restricted.expiresAt).toISOString(),
        user: null,
        verifiedEmail: restricted.verifiedEmail,
      },
      message: 'Session retrieved.',
    });

    return;
  }

  if (restricted) delete req.session.restrictedAuth;
  httpResponse.json(res, {
    data: { authenticated: false as const, kind: 'anonymous' as const, user: null },
    message: 'Session retrieved.',
  });
});

router.post(
  '/email-otp/request',
  csrfProtection,
  validateRequest({ body: emailOtpRequestSchema }),
  emailOtpDeliveryRateLimit,
  async function requestEmailOtpHandler(req, res) {
    const { email } = getValidated<{ body: typeof emailOtpRequestSchema }>(req).body!;
    const delivery = await requestEmailOtp(email, requestContext(req));

    httpResponse.json(res, {
      data: delivery,
      message: 'If you can use that email, check for a 6-digit code. Delivery can take a few minutes.',
      status: 202,
    });
  },
);

router.post(
  '/email-otp/resend',
  csrfProtection,
  validateRequest({ body: emailOtpFlowSchema }),
  emailOtpDeliveryRateLimit,
  async function resendEmailOtpHandler(req, res) {
    const { flowId } = getValidated<{ body: typeof emailOtpFlowSchema }>(req).body!;
    const delivery = await resendEmailOtp(flowId, requestContext(req));

    httpResponse.json(res, {
      data: delivery,
      message: 'If you can use that email, check for a 6-digit code. Delivery can take a few minutes.',
      status: 202,
    });
  },
);

router.post(
  '/email-otp/verify',
  csrfProtection,
  validateRequest({ body: emailOtpVerifySchema }),
  emailOtpVerificationRateLimit,
  async function verifyEmailOtpHandler(req, res) {
    const { flowId, pin } = getValidated<{ body: typeof emailOtpVerifySchema }>(req).body!;
    const identity = await verifyEmailOtp(flowId, pin, requestContext(req));
    const issuedAt = Date.now();
    const expiresAt = issuedAt + RESTRICTED_SESSION_MAX_AGE_MS;

    await regenerateSession(req);
    req.session.restrictedAuth = {
      allowedOperations: ['accounts:read', 'accounts:select', 'passkeys:enroll', 'passkeys:verify'],
      eligibleAccounts: identity.accounts,
      expiresAt,
      flowId,
      issuedAt,
      purpose: 'bootstrap_recovery',
      selectedAccountId: identity.accounts.length === 1 ? identity.accounts[0]?.accountId : undefined,
      userId: identity.userId,
      verifiedEmail: identity.email,
    };
    req.session.cookie.maxAge = RESTRICTED_SESSION_MAX_AGE_MS;

    httpResponse.json(res, {
      data: {
        kind: 'restricted' as const,
        authenticated: false as const,
        expiresAt: new Date(expiresAt).toISOString(),
        user: null,
        verifiedEmail: identity.email,
      },
      message: 'Email verified. Create and verify a passkey to finish signing in.',
    });
  },
);

function restrictedSession(req: Request) {
  const restricted = req.session?.restrictedAuth;

  if (!restricted || restricted.expiresAt <= Date.now()) {
    if (restricted) delete req.session.restrictedAuth;
    throw new HttpError({
      code: 'restricted_session_required',
      message: 'Verify an email code before continuing.',
      statusCode: 401,
    });
  }

  return restricted;
}

router.get('/restricted/accounts', function restrictedAccountsHandler(req, res) {
  const restricted = restrictedSession(req);

  httpResponse.json(res, {
    data: {
      accounts: restricted.eligibleAccounts.map((account) => ({
        ...account,
        selected: account.accountId === restricted.selectedAccountId,
      })),
    },
    message: 'Eligible accounts retrieved.',
  });
});

router.post(
  '/restricted/accounts/select',
  csrfProtection,
  validateRequest({ body: restrictedAccountSelectionSchema }),
  function selectRestrictedAccountHandler(req, res) {
    const restricted = restrictedSession(req);
    const { accountId } = getValidated<{ body: typeof restrictedAccountSelectionSchema }>(req).body!;
    const account = restricted.eligibleAccounts.find((candidate) => candidate.accountId === accountId);

    if (!account || (restricted.selectedAccountId && restricted.selectedAccountId !== accountId)) {
      res.status(404).send({ code: 'account_unavailable', message: 'The account is not available.' });

      return;
    }
    restricted.selectedAccountId = account.accountId;
    httpResponse.json(res, {
      data: { ...account, selected: true },
      message: 'Account selected.',
    });
  },
);

router.post('/sign-out', csrfProtection, async function signOutHandler(req, res) {
  if (req.isAuthenticated()) {
    await new Promise<void>((resolve, reject) => {
      req.logout((error) => (error ? reject(error) : resolve()));
    });
  }

  req.session.destroy(() => undefined);
  res.clearCookie('connect.sid');
  clearSessionHintCookie(res);
  res.status(204).send();
});

export { authOpenApiPaths, router as authRouter };
