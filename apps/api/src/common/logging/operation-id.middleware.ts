import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithOperationId } from './request-context.js';

export interface RequestWithOperationId extends Request {
  operationId: string;
}

export function operationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const operationId = randomUUID();
  (req as RequestWithOperationId).operationId = operationId;
  runWithOperationId(operationId, next);
}
