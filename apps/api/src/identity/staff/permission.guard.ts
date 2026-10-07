import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ROLE_PERMISSIONS, type Permission } from '../identity.types.js';

// Kept here so the decorator can import the guard without a circular dependency.
export const REQUIRED_PERMISSION_KEY = 'identity.required_permission';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<Permission>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (permission === undefined) return true;
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (user) {
      // A single query binds the chain to its owner and reads the current role.
      const chain = await this.prisma.sessionChain.findUnique({
        where: { id: user.sessionChainId },
        select: { userId: true, revokedAt: true, user: { select: { staffRole: true } } },
      });
      const role = chain?.user.staffRole;
      if (chain && chain.userId === user.userId && chain.revokedAt === null &&
        (role === 'admin' || role === 'editor') && ROLE_PERMISSIONS[role].includes(permission)) {
        return true;
      }
    }
    throw new ProblemDetailsException({ status: 403, title: 'Forbidden', type: 'forbidden' });
  }
}
