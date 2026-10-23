import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { meTransactionsQuery, type MeTransactionsQuery } from './transactions.queries.js';
import { TransactionsService } from './transactions.service.js';

/** GI8 (learner UI design §8.9): the signed-in learner's own transactions; no learner profile needed, like `/me/entitlements`. */
@Controller('me/transactions')
export class MeTransactionsController {
  constructor(@Inject(TransactionsService) private readonly transactions: TransactionsService) {}

  @Get()
  list(@Query({ schema: meTransactionsQuery }) query: MeTransactionsQuery, @Req() req: RequestWithUser) {
    return this.transactions.forLearner(req.user!.userId, query);
  }
}
