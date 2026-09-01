import passport from 'passport';

import { findUserById, resolveAuthUser } from './auth-service';

type SerializedUser = {
  accountId: string;
  credentialId?: string;
  id: string;
};

passport.serializeUser((user, done) => {
  done(null, { accountId: user.accountId, credentialId: user.credentialId, id: user.id });
});

passport.deserializeUser(async (serializedUser: SerializedUser, done) => {
  try {
    const user = await findUserById(serializedUser.id);

    if (!user) return done(null, false);

    return done(null, {
      ...(await resolveAuthUser(user)),
      authenticationMethod: 'passkey',
      credentialId: serializedUser.credentialId,
    });
  } catch (error) {
    return done(error as Error);
  }
});

export { passport };
