import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useApi } from '../../../auth/session-context';
import { Badge } from '../../../ui/Badge';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { ListState } from '../../../ui/ListState';
import { aiKeys, getJudgeAgreement, type Judge } from '../ai-api';
import { useAiFormat } from '../useAiFormat';

type Props = { judge: Judge; onClose: () => void };

/**
 * "Độ khớp với nhãn" (design §5.4, D15): per revision and criterion how many outputs carry both the owner's label and this judge's score, and how
 * often the two agree. A revision is "đã hiệu chỉnh" only with enough labels and enough agreement; until then its scores still show, marked "chưa".
 */
export function JudgeAgreementPanel({ judge, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const query = useQuery({ queryKey: aiKeys.judgeAgreement(judge.id), queryFn: () => getJudgeAgreement(api, judge.id) });
  const rate = (value: number | null) => (value === null ? t('ai.judges.agreementPanel.noRate') : `${format.percent(100 * value)}%`);

  let body;
  if (query.isPending) body = <ListState state="loading" />;
  else if (query.isError) {
    body = query.error instanceof ApiError && query.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void query.refetch()} />;
  } else {
    const { items, label_min: labelMin, agreement_min: agreementMin } = query.data;
    body = (
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={`${item.judge_revision_id}|${item.criterion}`} className="flex min-w-0 flex-col items-start gap-1 border-b border-border pb-3 text-ui text-ink">
            <span className="wrap-anywhere">
              {t('ai.judges.agreementPanel.row', {
                revision: item.revision, criterion: item.criterion, labeled: format.number(item.labeled), rate: rate(item.rate), exact: rate(item.exact_rate),
              })}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={item.calibrated ? 'success' : 'neutral'}>{t(item.calibrated ? 'ai.judges.agreementPanel.calibrated' : 'ai.judges.agreementPanel.uncalibrated')}</Badge>
              {!item.calibrated && (
                <span className="text-xs text-muted">
                  {t('ai.judges.agreementPanel.need', { min: format.number(labelMin), ratio: `${format.percent(100 * agreementMin)}%` })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="judge-agreement" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="judge-agreement" className="text-lg font-bold text-ink">{t('ai.judges.agreementPanel.title', { name: judge.name })}</h2>
        <Button variant="secondary" onPress={onClose}>{t('ai.judges.agreementPanel.close')}</Button>
      </div>
      {body}
    </section>
  );
}
