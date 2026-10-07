import type { Request } from 'express';

export interface RequestUser {
  userId: string;
  sessionChainId: string;
}

export interface RequestWithUser extends Request {
  user?: RequestUser;
}
