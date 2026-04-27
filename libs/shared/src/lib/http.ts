import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';

export const errorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  data: z.unknown().optional(),
});

export const responseEnvelopeSchema = z.object({
  status: z.number().optional(),
  message: z.string(),
  data: z.unknown(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type ResponseEnvelope = z.infer<typeof responseEnvelopeSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

function createEnvelope(message: string, data: unknown, meta?: Record<string, unknown>): ResponseEnvelope {
  return { message, data, meta };
}

function jsonResponse(
  res: Response,
  { data, status, meta, message }: { data: unknown; status?: number; meta?: Record<string, unknown>; message: string },
) {
  return status !== undefined
    ? res.status(status).send(createEnvelope(message, data, meta))
    : res.send(createEnvelope(message, data, meta));
}

class HttpError extends Error {
  data: unknown;
  code: string;
  statusCode: number;

  constructor({
    data,
    code,
    message,
    statusCode,
  }: {
    data?: unknown;
    code: string;
    message: string;
    statusCode: number;
  }) {
    super(message);

    this.data = data;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ error ] API request failed', error);

  if (error instanceof HttpError) {
    res.status(error.statusCode).send({
      code: error.code,
      message: error.message,
      data: error.data,
    });

    return;
  }

  res.status(500).send({
    code: 'internal_server_error',
    message: 'The request could not be completed.',
  });
}

export { HttpError, createEnvelope, jsonResponse };
