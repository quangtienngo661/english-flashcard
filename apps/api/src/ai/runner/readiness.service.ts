import { Inject, Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/index.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiOperation, AiPurpose, UnavailableReason } from '../ai.types.js';
import { CallLedger } from './call-ledger.service.js';
import { secondsToNextAiDay } from './run-rules.js';
import { SelectionReader, type Selection } from './selection.js';

export type ReadinessCheck =
  | { ready: true; selection: Selection }
  | { ready: false; reason: UnavailableReason; retry_after_seconds?: number };

/**
 * Design §8.1 step 3 and §8.5. A learner call needs the switch on, a model, its provider and room under the daily cap; a test or
 * eval call of an admin needs only the model and its provider (B6E31, B6E89). The count takes no lock (B6E90).
 */
@Injectable()
export class ReadinessService {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(SelectionReader) private readonly selections: SelectionReader,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(CallLedger) private readonly ledger: CallLedger,
  ) {}

  async check(operation: AiOperation, purpose: AiPurpose, now: Date): Promise<ReadinessCheck> {
    const learner = purpose === 'learner';
    const settings = learner ? await this.settings.get() : null;
    if (settings && !settings.entitlements.aiEnabled) return { ready: false, reason: 'ai-disabled' };
    const selection = await this.selections.load(operation);
    if (!selection) return { ready: false, reason: 'model-not-set' };
    if (!this.registry.get(selection.provider)) return { ready: false, reason: 'provider-not-configured' };
    const cap = settings?.ai.dailyProviderCallsCap ?? null;
    if (cap === 0) return { ready: false, reason: 'daily-call-cap' };
    if (cap !== null && (await this.ledger.countToday(now)) >= cap) {
      return { ready: false, reason: 'daily-call-cap', retry_after_seconds: secondsToNextAiDay(now) };
    }
    return { ready: true, selection };
  }
}
