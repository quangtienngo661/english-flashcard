import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from './fake-request-user.middleware.js';
import type { RequestUser } from './request-user.js';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});
