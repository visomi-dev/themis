import axios from 'axios';

const email = 'engineer@themis.dev';
const password = 'S3cureAuth!';

const toCookieHeader = (setCookie: string[] | undefined) =>
  setCookie?.map((cookie) => cookie.split(';', 1)[0]).join('; ') ?? '';

describe('auth API', () => {
  beforeEach(async () => {
    await axios.delete('/test/mailbox');
  });

  it('should return a message from the API root', async () => {
    const res = await axios.get(`/`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello Themis API' });
  });

  it('completes sign-up, verification, session restore, sign-out, and sign-in verification', async () => {
    const signUpResponse = await axios.post('/auth/sign-up', {
      email,
      password,
    });

    expect(signUpResponse.status).toBe(201);
    expect(signUpResponse.data.email).toBe(email);
    expect(signUpResponse.data.purpose).toBe('sign_up');

    const signUpMail = await axios.get('/test/mailbox/latest', {
      params: {
        email,
        purpose: 'sign_up',
      },
    });

    const signUpVerifyResponse = await axios.post(
      '/auth/sign-up/verify',
      {
        challengeId: signUpResponse.data.challengeId,
        pin: signUpMail.data.pin,
      },
      {
        validateStatus: () => true,
      },
    );

    expect(signUpVerifyResponse.status).toBe(200);
    expect(signUpVerifyResponse.data.user.email).toBe(email);
    expect(signUpVerifyResponse.data.user.emailVerifiedAt).not.toBeNull();

    const sessionCookie = toCookieHeader(signUpVerifyResponse.headers['set-cookie']);
    const sessionResponse = await axios.get('/auth/session', {
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(sessionResponse.data.authenticated).toBe(true);
    expect(sessionResponse.data.user.email).toBe(email);

    const signOutResponse = await axios.post(
      '/auth/sign-out',
      {},
      {
        headers: {
          Cookie: sessionCookie,
        },
        validateStatus: () => true,
      },
    );

    expect(signOutResponse.status).toBe(204);

    await axios.delete('/test/mailbox');

    const signInPasswordResponse = await axios.post('/auth/sign-in/password', {
      email,
      password,
    });

    expect(signInPasswordResponse.status).toBe(200);
    expect(signInPasswordResponse.data.purpose).toBe('sign_in');

    const signInMail = await axios.get('/test/mailbox/latest', {
      params: {
        email,
        purpose: 'sign_in',
      },
    });

    const invalidVerifyResponse = await axios.post(
      '/auth/sign-in/verify',
      {
        challengeId: signInPasswordResponse.data.challengeId,
        pin: '000000',
      },
      {
        validateStatus: () => true,
      },
    );

    expect(invalidVerifyResponse.status).toBe(401);

    const signInVerifyResponse = await axios.post('/auth/sign-in/verify', {
      challengeId: signInPasswordResponse.data.challengeId,
      pin: signInMail.data.pin,
    });

    expect(signInVerifyResponse.status).toBe(200);
    expect(signInVerifyResponse.data.user.email).toBe(email);
  });
});
