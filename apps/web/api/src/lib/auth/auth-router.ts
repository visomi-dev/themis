import passport from 'passport';
import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';
import {
  challengeIdSchema,
  emailSchema,
  passwordSchema,
  pinSchema,
  readValidated,
  validateRequest,
  z,
} from '../http/route-schemas.js';

import { AuthError } from './auth-errors.js';
import { createAuthService } from './auth-service.js';

const authUserSchema = z
  .object({
    accountId: z
      .string()
      .meta({ description: 'Active account identifier.', example: 'account-123', id: 'AuthAccountId' }),
    email: emailSchema,
    emailVerifiedAt: z.string().nullable().meta({
      description: 'Verification timestamp.',
      example: '2026-01-01T00:00:00.000Z',
      id: 'AuthEmailVerifiedAt',
    }),
    id: z.string().meta({ description: 'User identifier.', example: 'user-123', id: 'AuthUserId' }),
  })
  .meta({ id: 'AuthUser' });

const challengeSchema = z
  .object({
    challengeId: challengeIdSchema,
    email: emailSchema,
    expiresAt: z.string().meta({ description: 'Challenge expiry timestamp.', example: '2026-01-01T00:10:00.000Z' }),
    purpose: z.enum(['sign_in', 'sign_up']).meta({ description: 'Challenge purpose.', example: 'sign_up' }),
  })
  .meta({ id: 'AuthChallenge' });

const credentialsSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .meta({ id: 'AuthCredentials' });

const challengeVerificationSchema = z
  .object({
    challengeId: challengeIdSchema,
    pin: pinSchema,
  })
  .meta({ id: 'AuthChallengeVerification' });

const resendVerificationSchema = z
  .object({
    challengeId: challengeIdSchema,
  })
  .meta({ id: 'AuthResendVerification' });

const forgottenPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .meta({ id: 'ForgottenPasswordRequest' });

const sessionResponseSchema = z
  .object({
    authenticated: z.boolean(),
    user: authUserSchema.nullable(),
  })
  .meta({ id: 'AuthSessionResponse' });

const authenticatedResponseSchema = z
  .object({
    authenticated: z.literal(true),
    user: authUserSchema,
  })
  .meta({ id: 'AuthenticatedResponse' });

const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .meta({ id: 'MessageResponse' });

const authOpenApiPaths = {
  '/auth/session': {
    get: {
      responses: {
        200: {
          content: { 'application/json': { schema: sessionResponseSchema } },
          description: 'Current authentication session.',
        },
      },
    },
  },
  '/auth/sign-up': {
    post: {
      requestBody: { content: { 'application/json': { schema: credentialsSchema } } },
      responses: {
        201: {
          content: { 'application/json': { schema: challengeSchema } },
          description: 'Sign-up challenge created.',
        },
      },
    },
  },
  '/auth/sign-up/verify': {
    post: {
      requestBody: { content: { 'application/json': { schema: challengeVerificationSchema } } },
      responses: {
        200: {
          content: { 'application/json': { schema: authenticatedResponseSchema } },
          description: 'Sign-up verification complete.',
        },
      },
    },
  },
  '/auth/sign-in/password': {
    post: {
      requestBody: { content: { 'application/json': { schema: credentialsSchema } } },
      responses: {
        200: {
          content: { 'application/json': { schema: challengeSchema } },
          description: 'Sign-in challenge created.',
        },
      },
    },
  },
  '/auth/sign-in/verify': {
    post: {
      requestBody: { content: { 'application/json': { schema: challengeVerificationSchema } } },
      responses: {
        200: {
          content: { 'application/json': { schema: authenticatedResponseSchema } },
          description: 'Sign-in verification complete.',
        },
      },
    },
  },
  '/auth/verification/resend': {
    post: {
      requestBody: { content: { 'application/json': { schema: resendVerificationSchema } } },
      responses: {
        200: {
          content: { 'application/json': { schema: challengeSchema } },
          description: 'Verification challenge resent.',
        },
      },
    },
  },
  '/auth/sign-out': {
    post: {
      responses: { 204: { description: 'Signed out.' } },
    },
  },
  '/auth/password/forgotten': {
    post: {
      requestBody: { content: { 'application/json': { schema: forgottenPasswordSchema } } },
      responses: {
        200: {
          content: { 'application/json': { schema: messageResponseSchema } },
          description: 'Password reset requested.',
        },
      },
    },
  },
};

const loginUser = (req: Request, user: Express.User) =>
  new Promise<void>((resolve, reject) => {
    req.login(user, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const logoutUser = (req: Request) =>
  new Promise<void>((resolve, reject) => {
    req.logout((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const buildAuthRouter = (config: AuthConfig) => {
  const router = Router();
  const service = createAuthService(config);

  router.get('/session', (_req, res) => {
    res.send({
      authenticated: _req.isAuthenticated(),
      user: _req.user ?? null,
    });
  });

  router.post('/sign-up', validateRequest({ body: credentialsSchema }), async (req, res) => {
    const { email, password } = readValidated<{ body: typeof credentialsSchema }>(req).body!;
    const challenge = await service.signUp(email, password);
    res.status(201).send(challenge);
  });

  router.post('/sign-up/verify', validateRequest({ body: challengeVerificationSchema }), async (req, res) => {
    const { challengeId, pin } = readValidated<{ body: typeof challengeVerificationSchema }>(req).body!;
    const user = await service.verifyChallenge(challengeId, pin, 'sign_up');

    await loginUser(req, user);

    res.send({ authenticated: true, user });
  });

  router.post(
    '/sign-in/password',
    validateRequest({ body: credentialsSchema }),
    (req: Request, res: Response, next: NextFunction) => {
      const credentials = readValidated<{ body: typeof credentialsSchema }>(req).body!;
      req.body = credentials;

      passport.authenticate(
        'local',
        { session: false },
        async (error: unknown, user?: Express.User, info?: { message?: string }) => {
          if (error) {
            next(error);
            return;
          }

          if (!user) {
            next(new AuthError(401, 'invalid_credentials', info?.message ?? 'Incorrect email or password.'));
            return;
          }

          try {
            const fullUser = await service.findUserById(user.id);

            if (!fullUser) {
              throw new AuthError(404, 'user_not_found', 'The account could not be found.');
            }

            const challenge = await service.beginSignIn(fullUser);
            res.send(challenge);
          } catch (innerError) {
            next(innerError);
          }
        },
      )(req, res, next);
    },
  );

  router.post('/sign-in/verify', validateRequest({ body: challengeVerificationSchema }), async (req, res) => {
    const { challengeId, pin } = readValidated<{ body: typeof challengeVerificationSchema }>(req).body!;
    const user = await service.verifyChallenge(challengeId, pin, 'sign_in');

    await loginUser(req, user);

    res.send({ authenticated: true, user });
  });

  router.post('/verification/resend', validateRequest({ body: resendVerificationSchema }), async (req, res) => {
    const { challengeId } = readValidated<{ body: typeof resendVerificationSchema }>(req).body!;
    const challenge = await service.resendChallenge(challengeId);

    res.send(challenge);
  });

  router.post('/sign-out', async (req, res) => {
    await logoutUser(req);
    req.session.destroy(() => undefined);
    res.clearCookie('connect.sid');
    res.status(204).send();
  });

  router.post('/password/forgotten', validateRequest({ body: forgottenPasswordSchema }), async (req, res) => {
    const { email } = readValidated<{ body: typeof forgottenPasswordSchema }>(req).body!;
    await service.requestPasswordReset(email);
    res.status(200).send({ message: 'If an account exists for that email, a reset link has been sent.' });
  });

  return router;
};

export { authOpenApiPaths, buildAuthRouter };
