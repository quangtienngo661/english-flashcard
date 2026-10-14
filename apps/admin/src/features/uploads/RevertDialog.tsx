import { useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { revertUpload, type RevertReport } from '../content/content-api';
import { useSubmitAction } from '../content/useSubmitAction';

type Props = { batchId: string; fileName: string; onClose: () => void; onReverted: (report: RevertReport) => void };

/** Confirmation for reverting a batch (Figma `revert-dialog`). Mounted only while open, so each opening is a new submission with a new key. */
export function RevertDialog({ batchId, fileName, onClose, onReverted }: Props) {
  const t = useTranslations();
  const api = useApi();
  const action = useSubmitAction((key) => revertUpload(api, batchId, key), `revert:${batchId}`, (result) => onReverted(result.report));
  const locked = action.waitSeconds > 0;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !action.pending && onClose()}
      isDismissable={!action.pending}
      title={t('batch.revertTitle', { file: fileName })}
      actions={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={action.pending}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onPress={() => void action.submit()} isPending={action.pending} isDisabled={locked}>
            {locked ? t('batch.wait', { seconds: action.waitSeconds }) : t('batch.revert')}
          </Button>
        </>
      }
    >
      <p className="break-words text-ui text-muted">{t('batch.revertBody')}</p>
      {action.error && (
        <Banner
          variant="error"
          action={
            action.canRetry ? (
              <Button variant="secondary" onPress={() => void action.submit()}>
                {t('common.retry')}
              </Button>
            ) : undefined
          }
        >
          {action.error}
        </Banner>
      )}
    </Dialog>
  );
}
