import { UserProfile } from "@matcha/prisma";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      profile?: UserProfile | null;
    }
    interface Request {
      validatedData: {
        body?: any;
        params?: any;
        query?: any;
      };
    }
  }
}