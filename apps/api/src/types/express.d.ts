export {};

declare global {
  namespace Express {
    interface User {
      id: string;
      profile: {
        id:string;
      } | null;
      hasPassword:boolean;
      sessionId?: string;
      exp?: number;
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