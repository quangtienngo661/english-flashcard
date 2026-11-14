import type { Request } from 'express';

export interface RequestUser {
  userId: string;
  sessionChainId: string;
}

/** What the auth guard read about the caller's account and session chain on this request (Bước 8, D24, D29). */
export interface RequestAccount {
  status: 'active' | 'locked' | 'deleting';
  authMethod: 'password' | 'google';
  revoked: boolean;
}

export interface RequestWithUser extends Request {
  user?: RequestUser;
  /** Set on non-public routes only, after the account passed the status check. */
  account?: RequestAccount;
}
