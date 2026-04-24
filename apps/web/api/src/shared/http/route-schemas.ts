import 'zod-openapi';

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod/v4';
import * as z from 'zod/v4';

import { HttpError } from 'web-shared';

type RequestSchemas = {
  body?: z.ZodType;
  headers?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

type ValidatedData<T extends RequestSchemas> = {
  body: T['body'] extends z.ZodType ? z.output<T['body']> : undefined;
  headers: T['headers'] extends z.ZodType ? z.output<T['headers']> : undefined;
  params: T['params'] extends z.ZodType ? z.output<T['params']> : undefined;
  query: T['query'] extends z.ZodType ? z.output<T['query']> : undefined;
};

type RequestWithValidated<T extends RequestSchemas> = Request & {
  validated: ValidatedData<T>;
};

const emailSchema = z.email().meta({
  description: 'Account email address.',
  example: 'engineer@themis.dev',
  id: 'AuthEmail',
});

const passwordSchema = z.string().min(8).meta({
  description: 'Account password.',
  example: 'S3cureAuth!',
  id: 'AuthPassword',
});

const challengeIdSchema = z.string().min(1).meta({
  description: 'Verification challenge identifier.',
  example: 'challenge-123',
  id: 'AuthChallengeId',
});

const pinSchema = z.string().min(1).meta({
  description: 'Verification PIN.',
  example: '123456',
  id: 'AuthPin',
});

const projectIdParamSchema = z.string().min(1).meta({
  description: 'Project identifier.',
  example: 'project-123',
  id: 'ProjectId',
});

const apiKeyIdParamSchema = z.string().min(1).meta({
  description: 'API key identifier.',
  example: 'api-key-123',
  id: 'ApiKeyId',
});

const validate = <T>(schema: z.ZodType<T>, input: unknown): T => {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      throw new HttpError({
        data: issue,
        code: 'invalid_request',
        message: issue?.message ?? 'The request payload is invalid.',
        statusCode: 400,
      });
    }

    throw error;
  }
};

const validateRequest = <T extends RequestSchemas>(schemas: T): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = {
        body: schemas.body ? validate(schemas.body, req.body) : undefined,
        headers: schemas.headers ? validate(schemas.headers, req.headers) : undefined,
        params: schemas.params ? validate(schemas.params, req.params) : undefined,
        query: schemas.query ? validate(schemas.query, req.query) : undefined,
      } as ValidatedData<T>;

      if (validated.body !== undefined) {
        req.body = validated.body;
      }

      Object.assign(req, {
        validated,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

const readValidated = <T extends RequestSchemas>(req: Request) => (req as RequestWithValidated<T>).validated;

export {
  apiKeyIdParamSchema,
  challengeIdSchema,
  emailSchema,
  passwordSchema,
  pinSchema,
  projectIdParamSchema,
  readValidated,
  validate,
  validateRequest,
  z,
};
export type { RequestSchemas, RequestWithValidated, ValidatedData };
