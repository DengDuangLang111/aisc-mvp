import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string; // Supabase user id
        email?: string;
        [key: string]: any;
      };
    }
  }
}
