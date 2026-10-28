import { Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import type { DeletionOutcome } from './account-deletion.service.js';
import { AccountDeletionRequests } from './account-deletion-requests.service.js';
import { deleteMyAccountSchema, type DeleteMyAccountBody } from './delete.schemas.js';

/** 204 when the account is gone; 202 `{ status: 'pending' }` when it is left `deleting` and the retry job finishes it (design §7.2). */
export function answerDeletion(res: Response, outcome: DeletionOutcome): { status: 'pending' } | undefined {
  if (outcome === 'pending') {
    res.status(202);
    return { status: 'pending' };
  }
  res.status(204);
  return undefined;
}

@Controller('me/account')
export class AccountDeletionController {
  constructor(@Inject(AccountDeletionRequests) private readonly requests: AccountDeletionRequests) {}

  @Post('delete')
  @RateLimit('user.write', 'auth.delete.user')
  async deleteMyAccount(
    @Body({ schema: deleteMyAccountSchema }) body: DeleteMyAccountBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: 'pending' } | undefined> {
    const outcome = await this.requests.deleteOwn(req.user!, body, { res, googleReauthUserId: null });
    return answerDeletion(res, outcome);
  }
}
