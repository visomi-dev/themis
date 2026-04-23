import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AuthError } from './auth-errors';

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
        next(new AuthError(401, 'authentication_required', 'Sign in to access this resource.'));
        return;
      }

      if (options?.roles && !options.roles.includes(req.user.role)) {
        next(new AuthError(403, 'forbidden', 'You do not have access to this resource.'));
        return;
      }

      next();
    };
  }

  request(req: Request): AuthenticatedRequest {
    if (!req.user) {
      throw new AuthError(401, 'authentication_required', 'Sign in to access this resource.');
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
