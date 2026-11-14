import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { RequestAccount } from '../../common/request-user/request-user.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export type AccountState = RequestAccount;

/** One read per request: the caller's session chain joined to its owner (design §6.1). Abstract so tests can replace it. */
export abstract class AccountStatusReader {
  /** `null` when the chain does not exist or belongs to another user. */
  abstract read(userId: string, chainId: string): Promise<AccountState | null>;
}

@Injectable()
export class PrismaAccountStatusReader extends AccountStatusReader {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {
    super();
  }

  async read(userId: string, chainId: string): Promise<AccountState | null> {
    const chain = await this.prisma.sessionChain.findUnique({
      where: { id: chainId },
      select: { userId: true, revokedAt: true, authMethod: true, user: { select: { status: true } } },
    });
    if (!chain || chain.userId !== userId) return null;
    return {
      status: chain.user.status as AccountState['status'],
      authMethod: chain.authMethod as AccountState['authMethod'],
      revoked: chain.revokedAt !== null,
    };
  }
}
