declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface User {
      accountId: string;
      email: string;
      emailVerifiedAt: string | null;
      id: string;
      role: string;
    }
  }
}

declare module 'express-session' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface SessionData {
    passport?: {
      user?: {
        accountId: string;
        id: string;
      };
    };
  }
}

export {};
