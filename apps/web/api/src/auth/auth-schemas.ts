import { emailSchema, responseEnvelope, z } from '../shared/http/route-schemas';

export const authUserSchema = z
  .object({
    accountId: z.string().meta({ description: 'Active account identifier.', example: 'account-123' }),
    email: emailSchema,
    emailVerifiedAt: z.string().nullable(),
    id: z.string().meta({ description: 'User identifier.', example: 'user-123' }),
    role: z.string().meta({ description: 'Active account role.', example: 'owner' }),
    authenticationMethod: z.literal('passkey').optional(),
    credentialId: z.string().optional(),
  })
  .meta({ id: 'AuthUser' });

export type AuthUser = z.infer<typeof authUserSchema>;

export const emailOtpRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict()
  .meta({ id: 'EmailOtpRequest' });

export const emailOtpFlowSchema = z
  .object({
    flowId: z.uuid().meta({ description: 'Opaque email bootstrap or recovery flow reference.' }),
  })
  .strict()
  .meta({ id: 'EmailOtpFlow' });

export const emailOtpVerifySchema = emailOtpFlowSchema
  .extend({
    pin: z.string().regex(/^\d{6}$/),
  })
  .strict()
  .meta({ id: 'EmailOtpVerify' });

export const emailOtpDeliverySchema = z
  .object({
    flowId: z.uuid(),
    resendAvailableAt: z.string(),
  })
  .meta({ id: 'EmailOtpDelivery' });

export const restrictedSessionSchema = z
  .object({
    authenticated: z.literal(false),
    kind: z.literal('restricted'),
    expiresAt: z.string(),
    user: z.null(),
    verifiedEmail: emailSchema,
  })
  .meta({ id: 'RestrictedAuthSession' });

export const restrictedAccountChoiceSchema = z
  .object({ accountId: z.string(), name: z.string(), role: z.string(), selected: z.boolean() })
  .strict()
  .meta({ id: 'RestrictedAccountChoice' });
export const restrictedAccountSelectionSchema = z.object({ accountId: z.string().min(1) }).strict();

export const sessionResponseSchema = z
  .discriminatedUnion('kind', [
    z.object({ authenticated: z.literal(false), kind: z.literal('anonymous'), user: z.null() }),
    restrictedSessionSchema,
    z.object({ authenticated: z.literal(true), kind: z.literal('full'), user: authUserSchema }),
  ])
  .meta({ id: 'AuthSessionResponse' });

const errorResponse = (description: string) => ({
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
  description,
});

const deliveryResponse = {
  202: {
    content: {
      'application/json': { schema: responseEnvelope(emailOtpDeliverySchema, 'EmailOtpDeliveryEnvelope') },
    },
    description: 'Generic email OTP delivery response.',
  },
  400: errorResponse('The request payload is invalid.'),
  403: errorResponse('Origin is not allowed.'),
  429: errorResponse('Generic email OTP cooldown response.'),
};

export const authOpenApiPaths = {
  '/auth/email-otp/request': {
    post: {
      requestBody: { required: true, content: { 'application/json': { schema: emailOtpRequestSchema } } },
      responses: deliveryResponse,
    },
  },
  '/auth/email-otp/resend': {
    post: {
      requestBody: { required: true, content: { 'application/json': { schema: emailOtpFlowSchema } } },
      responses: deliveryResponse,
    },
  },
  '/auth/email-otp/verify': {
    post: {
      requestBody: { required: true, content: { 'application/json': { schema: emailOtpVerifySchema } } },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: responseEnvelope(restrictedSessionSchema, 'RestrictedAuthSessionEnvelope'),
            },
          },
          description: 'Restricted session established.',
        },
        400: errorResponse('The request payload is invalid.'),
        401: errorResponse('The verification request could not be completed.'),
        403: errorResponse('Origin is not allowed.'),
        429: errorResponse('Generic email OTP cooldown response.'),
      },
    },
  },
  '/auth/session': {
    get: {
      responses: {
        200: {
          content: { 'application/json': { schema: responseEnvelope(sessionResponseSchema, 'AuthSessionEnvelope') } },
          description: 'Current anonymous, restricted, or full session.',
        },
      },
    },
  },
  '/auth/restricted/accounts': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': {
              schema: responseEnvelope(
                z.object({ accounts: z.array(restrictedAccountChoiceSchema) }).strict(),
                'RestrictedAccountChoicesEnvelope',
              ),
            },
          },
          description: 'Eligible account choices available only after email verification.',
        },
      },
    },
  },
  '/auth/restricted/accounts/select': {
    post: {
      requestBody: { required: true, content: { 'application/json': { schema: restrictedAccountSelectionSchema } } },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: responseEnvelope(restrictedAccountChoiceSchema, 'RestrictedAccountSelectionEnvelope'),
            },
          },
          description: 'Selected account bound immutably to the restricted session.',
        },
      },
    },
  },
  '/auth/sign-out': {
    post: { responses: { 204: { description: 'Signed out.' }, 403: errorResponse('Origin is not allowed.') } },
  },
};
