import { challengeIdSchema, emailSchema, passwordSchema, pinSchema, z } from '../shared/http/route-schemas';

export const authUserSchema = z
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
    role: z.string().meta({ description: 'Active account role.', example: 'owner', id: 'AuthRole' }),
  })
  .meta({ id: 'AuthUser' });

export const challengeSchema = z
  .object({
    challengeId: challengeIdSchema,
    email: emailSchema,
    expiresAt: z.string().meta({ description: 'Challenge expiry timestamp.', example: '2026-01-01T00:10:00.000Z' }),
    purpose: z.enum(['sign_in', 'sign_up']).meta({ description: 'Challenge purpose.', example: 'sign_up' }),
  })
  .meta({ id: 'AuthChallenge' });

export type AuthUser = z.infer<typeof authUserSchema>;
export type VerificationPurpose = z.infer<typeof challengeSchema>['purpose'];
export type AuthChallengePayload = z.infer<typeof challengeSchema>;

export const credentialsSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .meta({ id: 'AuthCredentials' });

export const challengeVerificationSchema = z
  .object({
    challengeId: challengeIdSchema,
    pin: pinSchema,
  })
  .meta({ id: 'AuthChallengeVerification' });

export const resendVerificationSchema = z
  .object({
    challengeId: challengeIdSchema,
  })
  .meta({ id: 'AuthResendVerification' });

export const forgottenPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .meta({ id: 'ForgottenPasswordRequest' });

export const sessionResponseSchema = z
  .object({
    authenticated: z.boolean(),
    user: authUserSchema.nullable(),
  })
  .meta({ id: 'AuthSessionResponse' });

export const authenticatedResponseSchema = z
  .object({
    authenticated: z.literal(true),
    user: authUserSchema,
  })
  .meta({ id: 'AuthenticatedResponse' });

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .meta({ id: 'MessageResponse' });

export const challengeOrAuthSchema = z
  .object({
    authenticated: z.literal(true),
    user: authUserSchema,
  })
  .or(challengeSchema)
  .meta({ id: 'AuthChallengeOrAuthenticated' });

export const authOpenApiPaths = {
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
          content: { 'application/json': { schema: challengeOrAuthSchema } },
          description: 'Sign-in challenge created or already verified.',
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
