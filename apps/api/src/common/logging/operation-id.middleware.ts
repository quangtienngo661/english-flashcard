import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestWithOperationId extends Request {
  operationId: string;
}

export function operationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as RequestWithOperationId).operationId = randomUUID();
  next();
}
