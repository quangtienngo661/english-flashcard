import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import type { RequestUser } from '../../common/request-user/request-user.js';

const uuid = z.uuid();

@Injectable()
export class AccessTokenService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  sign(user: RequestUser): Promise<string> {
    const { keys, issuer, audience, accessTtlSeconds } = this.config.jwt;
    const key = keys[0];
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT({ sid: user.sessionChainId })
      .setProtectedHeader({ alg: 'HS256', kid: key.kid })
      .setSubject(user.userId)
      .setIssuedAt(iat)
      .setExpirationTime(iat + accessTtlSeconds)
      .setIssuer(issuer)
      .setAudience(audience)
      .sign(key.secret);
  }

  async verify(token: string): Promise<RequestUser | null> {
    const { keys, issuer, audience } = this.config.jwt;
    try {
      const { payload } = await jwtVerify(token, (protectedHeader) => {
        const key = keys.find((candidate) => candidate.kid === protectedHeader.kid);
        if (!key) throw new Error('Unknown signing key');
        return key.secret;
      }, {
        algorithms: ['HS256'],
        issuer,
        audience,
        currentDate: this.clock.now(),
        requiredClaims: ['exp', 'iat', 'sub', 'sid'],
      });
      const sub = uuid.safeParse(payload.sub);
      const sid = uuid.safeParse(payload.sid);
      if (!sub.success || !sid.success) return null;
      return { userId: sub.data, sessionChainId: sid.data };
    } catch {
      return null;
    }
  }
}
