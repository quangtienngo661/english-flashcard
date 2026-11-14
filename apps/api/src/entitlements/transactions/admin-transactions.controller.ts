import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { adminTransactionsQuery, type AdminTransactionsQuery } from './transactions.queries.js';
import { TransactionsService } from './transactions.service.js';

/** Every learner's transactions (learner UI design §8.9); money screens are admin-only (`settings.manage`, GI9). */
@Controller('admin/transactions')
@RequirePermission('settings.manage')
export class AdminTransactionsController {
  constructor(@Inject(TransactionsService) private readonly transactions: TransactionsService) {}

  @Get()
  list(@Query({ schema: adminTransactionsQuery }) query: AdminTransactionsQuery) {
    return this.transactions.forAdmin(query);
  }
}
