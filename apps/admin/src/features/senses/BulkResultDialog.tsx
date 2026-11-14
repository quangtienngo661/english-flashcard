import { useTranslations } from 'use-intl';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import type { BulkResult, SenseRow } from './senses-api';

const KNOWN_REASONS = ['stale-revision', 'publish-incomplete', 'sense-retired', 'not-found', 'sense-not-found', 'revision-not-open', 'revision-rejected'];

/** After a bulk action (A/88): how many rows succeeded, and each failed row with its reason. */
export function BulkResultDialog({ results, rows, onClose }: { results: BulkResult[]; rows: SenseRow[]; onClose: () => void }) {
  const t = useTranslations('senses.bulk');
  const failed = results.filter((r) => !r.ok);
  const label = (id: string) => {
    const row = rows.find((r) => r.sense_id === id);
    return row ? `${row.lemma} · ${row.pos}${row.content?.gloss_vi ? ` — ${row.content.gloss_vi}` : ''}` : id;
  };
  const reason = (r: BulkResult) => {
    const text = r.reason && KNOWN_REASONS.includes(r.reason) ? t(`reasons.${r.reason}` as 'reasons.stale-revision') : t('reasons.other', { reason: r.reason ?? '' });
    if (r.reason !== 'publish-incomplete' || !r.violations?.length) return text;
    return `${text}: ${r.violations.map((v) => t(`missing.${v}`)).join(', ')}`;
  };
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('resultTitle')}
      size="md"
      actions={
        <Button variant="secondary" onPress={onClose}>
          {t('close')}
        </Button>
      }
    >
      <p role="status" className="text-ui font-semibold text-ink">
        {t('summary', { ok: results.length - failed.length, failed: failed.length })}
      </p>
      {failed.length > 0 && (
        <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
          {failed.map((r) => (
            <li key={r.sense_id} className="flex flex-col gap-0.5 py-2">
              <span className="wrap-anywhere text-ui font-semibold text-ink">{label(r.sense_id)}</span>
              <span className="text-xs text-danger">{reason(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
