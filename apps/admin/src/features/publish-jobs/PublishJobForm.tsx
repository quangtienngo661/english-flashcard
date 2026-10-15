import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { createPublishJob } from '../content/content-api';
import { FilterFields, NO_FILTER, toFilter, type FilterValues } from '../content/FilterFields';
import { useSubmitAction } from '../content/useSubmitAction';

/** Spec §6.3 "Publish job": create a job from a filter (level, topic, part of speech, batch). */
export function PublishJobForm() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FilterValues>(NO_FILTER);
  const filter = toFilter(values, false);
  // A new filter is a new submission, so it gets a new Idempotency-Key.
  const action = useSubmitAction(
    (key) => createPublishJob(api, filter, key),
    JSON.stringify(filter),
    (created) => {
      void queryClient.invalidateQueries({ queryKey: ['publish-jobs'] });
      void navigate(`/publish-jobs/${created.job_id}`);
    },
  );
  const locked = action.waitSeconds > 0;
  const [confirmingAll, setConfirmingAll] = useState(false);
  // D25 / B25E29: no filter at all means the whole catalog, so ask first.
  const noFilter = Object.values(filter).every((value) => value === undefined);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (noFilter) setConfirmingAll(true);
        else void action.submit();
      }}
      className="flex flex-col gap-4 rounded-panel bg-surface p-4 shadow-card"
    >
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
      <FilterFields values={values} onChange={setValues} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onPress={() => void navigate('/publish-jobs')}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isPending={action.pending} isDisabled={locked}>
          {locked ? t('publishJobs.wait', { seconds: action.waitSeconds }) : t('publishJobs.create')}
        </Button>
      </div>
      {confirmingAll && (
        <Dialog
          isOpen
          onOpenChange={(open) => !open && setConfirmingAll(false)}
          title={t('publishJobs.confirmAllTitle')}
          actions={
            <>
              <Button variant="secondary" onPress={() => setConfirmingAll(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                isPending={action.pending}
                onPress={() => {
                  setConfirmingAll(false);
                  void action.submit();
                }}
              >
                {t('publishJobs.confirmAllSubmit')}
              </Button>
            </>
          }
        >
          <p className="break-words text-ui text-muted">{t('publishJobs.confirmAllBody')}</p>
        </Dialog>
      )}
    </form>
  );
}
