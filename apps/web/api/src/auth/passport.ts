import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { findUserById, resolveAuthUser, verifyPassword } from './auth-service';

passport.use(
  'local',
  new LocalStrategy({ passwordField: 'password', usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await verifyPassword(email, password);

      if (!user) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }

      return done(null, await resolveAuthUser(user));
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
    const user = await findUserById(serializedUser.id);

    if (!user) {
      return done(null, false);
    }

    return done(null, await resolveAuthUser(user));
  } catch (error) {
    return done(error as Error);
  }
});

export { passport };
