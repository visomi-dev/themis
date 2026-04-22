declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface User {
      accountId: string;
      email: string;
      emailVerifiedAt: string | null;
      id: string;
    }
  }
}

export {};
