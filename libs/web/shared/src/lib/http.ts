import type { NextFunction, Request, Response } from 'express';

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
      data: error.data,
      code: error.code,
      message: error.message,
    });

    return;
  }

  res.status(500).send({
    error: 'internal_server_error',
    message: 'The request could not be completed.',
  });
}

export { HttpError };
