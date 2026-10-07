import type { NextFunction, Request, Response } from 'express';
import type { RequestUser } from './request-user.js';

// TEST-ONLY seam standing in for Step 1's real JWT-based identity. Must never be imported into
// AppModule or any publicly reachable module (B0E6) — only into throwaway test modules.
export interface RequestWithUser extends Request {
  user?: RequestUser;
}

export function fakeRequestUserMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.headers['x-test-user-id'];
  if (typeof userId === 'string') {
    (req as RequestWithUser).user = { userId };
  }
  next();
}
