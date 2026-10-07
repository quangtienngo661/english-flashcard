import type { CookieOptions, Request, Response } from 'express';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { ClientType } from '../identity.types.js';
import type { IssuedSession } from './session.service.js';

export type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
};

const cookieOptions: CookieOptions = {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/v1/auth',
};

export function writeSession(
  res: Response, session: IssuedSession, now: Date, accessTtlSeconds: number,
): TokenResponse {
  const body: TokenResponse = {
    access_token: session.accessToken, token_type: 'Bearer', expires_in: accessTtlSeconds,
  };
  if (session.client === 'web') {
    res.cookie('refresh_token', session.refreshToken, {
      ...cookieOptions, maxAge: session.refreshExpiresAt.getTime() - now.getTime(),
    });
  } else {
    body.refresh_token = session.refreshToken;
  }
  return body;
}

export function readRefreshToken(req: Request): { token: string; path: ClientType } | null {
  // The strict body schema is validated by the controller before transport selection.
  // A body token always selects mobile, even when a cookie is also present.
  if (typeof req.body?.refresh_token === 'string') {
    return { token: req.body.refresh_token, path: 'mobile' };
  }
  const cookie: unknown = req.cookies?.refresh_token;
  if (typeof cookie !== 'string' || cookie.length === 0) return null;
  if (req.get('X-CSRF-Protection') !== '1') {
    throw new ProblemDetailsException({ status: 403, title: 'CSRF header required', type: 'csrf-header-required' });
  }
  return { token: cookie, path: 'web' };
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie('refresh_token', cookieOptions);
}
