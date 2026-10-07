import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { AccessTokenService } from './access-token.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessTokenService) private readonly tokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    const match = typeof authorization === 'string' ? /^Bearer +([^\s]+)$/i.exec(authorization) : null;
    request.user = match ? await this.tokens.verify(match[1]) ?? undefined : undefined;
    if (!isPublic && !request.user) {
      throw new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
    }
    return true;
  }
}
