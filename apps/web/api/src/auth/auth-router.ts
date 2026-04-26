import passport from 'passport';
import { Router, type NextFunction, type Request, type Response } from 'express';

import { getValidated, validateRequest } from '../shared/http/route-schemas';

import { authed, authedRequest } from './auth-middleware';
import {
  signUp,
  verifyChallenge,
  findUserById,
  beginSignIn,
  resendChallenge,
  requestPasswordReset,
} from './auth-service';
import {
  authOpenApiPaths,
  challengeVerificationSchema,
  credentialsSchema,
  forgottenPasswordSchema,
  resendVerificationSchema,
} from './auth-schemas';

import { HttpError, sendEnvelope, sendEnvelopeWithStatus } from 'shared';

const router = Router();

router.get('/session', authed(), async function sessionHandler(req, res) {
  const $req = authedRequest(req);

  sendEnvelope(res, { authenticated: true, user: $req.user }, 'Session retrieved.');
});

router.post('/sign-up', validateRequest({ body: credentialsSchema }), async function signUpHandler(req, res) {
  const { email, password } = getValidated<{ body: typeof credentialsSchema }>(req).body!;
  const challenge = await signUp(email, password);

  sendEnvelopeWithStatus(res, challenge, 'Verification code sent.', 201);
});

router.post(
  '/sign-up/verify',
  validateRequest({ body: challengeVerificationSchema }),
  async function verifySignUpHandler(req, res) {
    const { challengeId, pin } = getValidated<{ body: typeof challengeVerificationSchema }>(req).body!;
    const user = await verifyChallenge(challengeId, pin, 'sign_up');

    await new Promise<void>((resolve, reject) => {
      req.login(user, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    sendEnvelope(res, { authenticated: true, user }, 'Sign-up complete.');
  },
);

router.post(
  '/sign-in/password',
  validateRequest({ body: credentialsSchema }),
  function signInPasswordHandler(req: Request, res: Response, next: NextFunction) {
    const credentials = getValidated<{ body: typeof credentialsSchema }>(req).body!;
    req.body = credentials;

    passport.authenticate(
      'local',
      { session: false },
      async function passportCallback(error: unknown, user?: Express.User, info?: { message?: string }) {
        if (error) {
          next(error);
          return;
        }

        if (!user) {
          next(
            new HttpError({
              code: 'invalid_credentials',
              message: info?.message ?? 'Incorrect email or password.',
              statusCode: 401,
            }),
          );
          return;
        }

        try {
          const fullUser = await findUserById(user.id);

          if (!fullUser) {
            throw new HttpError({
              code: 'user_not_found',
              message: 'The account could not be found.',
              statusCode: 404,
            });
          }

          const challenge = await beginSignIn(fullUser);
          sendEnvelope(res, challenge, 'Verification code sent.');
        } catch (innerError) {
          next(innerError);
        }
      },
    )(req, res, next);
  },
);

router.post(
  '/sign-in/verify',
  validateRequest({ body: challengeVerificationSchema }),
  async function verifySignInHandler(req, res) {
    const { challengeId, pin } = getValidated<{ body: typeof challengeVerificationSchema }>(req).body!;
    const user = await verifyChallenge(challengeId, pin, 'sign_in');

    await new Promise<void>((resolve, reject) => {
      req.login(user, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    sendEnvelope(res, { authenticated: true, user }, 'Sign-in complete.');
  },
);

router.post(
  '/verification/resend',
  validateRequest({ body: resendVerificationSchema }),
  async function resendVerificationHandler(req, res) {
    const { challengeId } = getValidated<{ body: typeof resendVerificationSchema }>(req).body!;
    const challenge = await resendChallenge(challengeId);

    sendEnvelope(res, challenge, 'Verification code resent.');
  },
);

router.post('/sign-out', authed(), async function signOutHandler(req, res) {
  await new Promise<void>((resolve, reject) => {
    req.logout((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  req.session.destroy(() => undefined);
  res.clearCookie('connect.sid');
  res.status(204).send();
});

router.post(
  '/password/forgotten',
  validateRequest({ body: forgottenPasswordSchema }),
  async function forgottenPasswordHandler(req, res) {
    const { email } = getValidated<{ body: typeof forgottenPasswordSchema }>(req).body!;
    await requestPasswordReset(email);
    sendEnvelope(res, null, 'If an account exists for that email, a reset link has been sent.');
  },
);

export { authOpenApiPaths, router as authRouter };
