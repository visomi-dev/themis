import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { getAuthConfig } from '../config/auth-config.js';

import { createAuthService } from './auth-service.js';

let isConfigured = false;

const configurePassport = () => {
  if (isConfigured) {
    return passport;
  }

  const service = createAuthService(getAuthConfig());

  passport.use(
    'local',
    new LocalStrategy({ passwordField: 'password', usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await service.verifyPassword(email, password);

        if (!user) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        return done(null, await service.resolveAuthUser(user));
      } catch (error) {
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, { accountId: user.accountId, id: user.id });
  });

  passport.deserializeUser(async (serializedUser: { accountId: string; id: string }, done) => {
    try {
      const user = await service.findUserById(serializedUser.id);

      if (!user) {
        return done(null, false);
      }

      return done(null, await service.resolveAuthUser(user));
    } catch (error) {
      return done(error as Error);
    }
  });

  isConfigured = true;

  return passport;
};

export { configurePassport };
