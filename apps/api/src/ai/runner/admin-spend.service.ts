import { Inject, Injectable } from '@nestjs/common';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { SettingsService } from '../../settings/index.js';
import { CallLedger } from './call-ledger.service.js';
import { adminCapReached } from './admin-cap.js';
import type { Price } from './cost.js';

/**
 * The daily usd cap of admin AI work (nhóm B design §5.5, E7): test, eval and judge calls together, since 00:00 in Vietnam. A soft cap:
 * calls already in flight can overshoot it. The runner asks before every provider attempt; a job asks once when it starts.
 */
@Injectable()
export class AdminSpend {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(CallLedger) private readonly ledger: CallLedger,
  ) {}

  async reached(now: Date): Promise<boolean> {
    const { ai } = await this.settings.get();
    // No cap: nothing to compare, so the ledger is not asked.
    if (ai.adminDailyUsdCap === null) return false;
    return adminCapReached(await this.ledger.adminSpentToday(now), ai.adminDailyUsdCap);
  }

  /** B22 first: a model without both prices cannot be costed, so admin work on it does not start; then the cap. */
  async assertCanStart(price: Price | null, now: Date): Promise<void> {
    if (price === null) {
      throw new ProblemDetailsException({ status: 409, type: 'model-price-missing', title: 'The model has no price: enter its prices first' });
    }
    if (await this.reached(now)) {
      throw new ProblemDetailsException({ status: 409, type: 'admin-usd-cap', title: 'Admin AI work has reached today\'s usd cap' });
    }
  }
}
