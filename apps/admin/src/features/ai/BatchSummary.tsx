import { useTranslations } from 'use-intl';
import { Badge } from '../../ui/Badge';
import { type AiBatch, isBatchActive } from './batches-api';
import { useAiFormat } from './useAiFormat';

export function BatchStatusBadge({ batch }: { batch: AiBatch }) {
  const t = useTranslations();
  const tone = batch.status === 'finished' ? 'success' : batch.status === 'failed' ? 'danger' : isBatchActive(batch) ? 'warning' : 'neutral';
  return <Badge tone={tone}>{t(`ai.costs.batches.statuses.${batch.status}`)}</Badge>;
}

/** Read ledger totals as sent; an incomplete price must never look like a zero-cost run. */
export function BatchCost({ batch }: { batch: AiBatch }) {
  const t = useTranslations();
  const format = useAiFormat();
  return (
    <span className="flex flex-col gap-1 tabular-nums">
      <span className="font-semibold">{batch.cost_usd === null ? t('ai.costs.batches.unknown') : format.usd(batch.cost_usd)}</span>
      {(batch.cost_usd === null || batch.unknown_cost_calls > 0) && <span className="text-xs text-muted">{t('ai.costs.batches.knownSubtotal', { cost: format.usd(batch.known_cost_usd), count: batch.unknown_cost_calls })}</span>}
      {isBatchActive(batch) && <span className="text-xs text-warning">{t('ai.costs.batches.partial')}</span>}
    </span>
  );
}

export function BatchTokens({ batch }: { batch: AiBatch }) {
  const t = useTranslations();
  const format = useAiFormat();
  return (
    <span className="flex flex-col gap-1 tabular-nums">
      <span>{format.number(batch.input_tokens)} / {format.number(batch.output_tokens)}</span>
      <span className="text-xs text-muted">{t('ai.costs.batches.extraTokens', { cached: format.number(batch.cached_input_tokens), reasoning: format.number(batch.reasoning_tokens) })}</span>
      <span className="text-xs text-muted">{t('ai.costs.batches.calls', { calls: format.number(batch.calls), retries: format.number(batch.retries) })}</span>
    </span>
  );
}
