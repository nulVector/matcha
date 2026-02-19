export {};

declare global {
  namespace Express {
    interface User {
      id: string;
      tokenVersion:number;
      profile: {
        id:string;
      } | null;
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