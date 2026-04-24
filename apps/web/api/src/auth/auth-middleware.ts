import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HttpError } from 'web-shared';

type AuthenticatedContext = {
  accountId: string;
  role: string;
  userId: string;
};

type AuthenticatedRequest = Request & {
  user: Express.User;
};

type AuthenticatedOptions = {
  roles?: string[];
};

class AuthMiddleware {
  authenticated(options?: AuthenticatedOptions): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.isAuthenticated() || !req.user) {
        next(
          new HttpError({
            code: 'authentication_required',
            message: 'Sign in to access this resource.',
            statusCode: 401,
          }),
        );
        return;
      }

      if (options?.roles && !options.roles.includes(req.user.role)) {
        next(
          new HttpError({
            code: 'forbidden',
            message: 'You do not have access to this resource.',
            statusCode: 403,
          }),
        );
        return;
      }

      next();
    };
  }

  request(req: Request): AuthenticatedRequest {
    if (!req.user) {
      throw new HttpError({
        code: 'authentication_required',
        message: 'Sign in to access this resource.',
        statusCode: 401,
      });
    }

    return req as AuthenticatedRequest;
  }

  context(req: Request): AuthenticatedContext {
    const authenticatedRequest = this.request(req);

    return {
      accountId: authenticatedRequest.user.accountId,
      role: authenticatedRequest.user.role,
      userId: authenticatedRequest.user.id,
    };
  }
}

const authMiddleware = new AuthMiddleware();

export { authMiddleware };
export type { AuthenticatedContext, AuthenticatedOptions, AuthenticatedRequest };
