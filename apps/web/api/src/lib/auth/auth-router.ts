import passport from 'passport';
import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';

import { AuthError } from './auth-errors.js';
import { createAuthService } from './auth-service.js';

const asNonEmptyString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AuthError(400, 'invalid_request', `${fieldName} is required.`);
  }

  return value.trim();
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

  router.get('/session', (req, res) => {
    res.send({
      authenticated: req.isAuthenticated(),
      user: req.user ?? null,
    });
  });

  router.post('/sign-up', async (req, res) => {
    const email = asNonEmptyString(req.body?.email, 'email');
    const password = asNonEmptyString(req.body?.password, 'password');

    if (password.length < 8) {
      throw new AuthError(400, 'weak_password', 'Password must be at least 8 characters long.');
    }

    const challenge = await service.signUp(email, password);
    res.status(201).send(challenge);
  });

  router.post('/sign-up/verify', async (req, res) => {
    const challengeId = asNonEmptyString(req.body?.challengeId, 'challengeId');
    const pin = asNonEmptyString(req.body?.pin, 'pin');
    const user = await service.verifyChallenge(challengeId, pin, 'sign_up');

    await loginUser(req, user);

    res.send({ authenticated: true, user });
  });

  router.post('/sign-in/password', (req: Request, res: Response, next: NextFunction) => {
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
  });

  router.post('/sign-in/verify', async (req, res) => {
    const challengeId = asNonEmptyString(req.body?.challengeId, 'challengeId');
    const pin = asNonEmptyString(req.body?.pin, 'pin');
    const user = await service.verifyChallenge(challengeId, pin, 'sign_in');

    await loginUser(req, user);

    res.send({ authenticated: true, user });
  });

  router.post('/verification/resend', async (req, res) => {
    const challengeId = asNonEmptyString(req.body?.challengeId, 'challengeId');
    const challenge = await service.resendChallenge(challengeId);

    res.send(challenge);
  });

  router.post('/sign-out', async (req, res) => {
    await logoutUser(req);
    req.session.destroy(() => undefined);
    res.clearCookie('connect.sid');
    res.status(204).send();
  });

  router.post('/password/forgotten', async (req, res) => {
    const email = asNonEmptyString(req.body?.email, 'email');
    await service.requestPasswordReset(email);
    res.status(200).send({ message: 'If an account exists for that email, a reset link has been sent.' });
  });

  return router;
};

export { buildAuthRouter };
