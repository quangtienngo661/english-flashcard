import { useSearchParams } from 'react-router';
import { useTranslations } from 'use-intl';
import { Tabs } from '../../ui/Tabs';
import { AggregateCostsPanel } from './AggregateCostsPanel';
import { CostsBatchesPanel } from './CostsBatchesPanel';

/** Legacy group_by links keep opening the unchanged whole-system aggregate. */
export function AiCostsPage() {
  const t = useTranslations();
  const [params, setParams] = useSearchParams();
  const selected = params.has('group_by') ? 'aggregate' : 'batches';
  return (
    <Tabs
      label={t('ai.costs.batches.tabsLabel')}
      items={[{ id: 'batches', label: t('ai.costs.batches.tab') }, { id: 'aggregate', label: t('ai.costs.batches.aggregate') }]}
      selected={selected}
      onSelect={(tab) => setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete('page_token');
        next.delete('batch');
        if (tab === 'aggregate') next.set('group_by', 'day');
        else next.delete('group_by');
        return next;
      })}
    >
      {(tab) => tab === 'aggregate' ? <AggregateCostsPanel /> : <CostsBatchesPanel />}
    </Tabs>
  );
}
