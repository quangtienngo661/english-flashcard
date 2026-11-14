import { useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { exportEntriesWithoutSenses, exportSenses } from '../content/content-api';
import { FilterFields, NO_FILTER, toFilter, type FilterValues } from '../content/FilterFields';

/** The file name carries the admin's local date, not UTC (spec §6.3). */
function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Spec §6.3 "Xuất CSV": filters → `GET senses/export` → a file the editor fills in and re-uploads. */
export function ExportPage() {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const [values, setValues] = useState<FilterValues>(NO_FILTER);
  const [withoutSenses, setWithoutSenses] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const busy = useRef(false);

  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      if (withoutSenses) {
        saveBlob(await exportEntriesWithoutSenses(api, toFilter(values, true).level), `entries-without-senses-${localDate(new Date())}.csv`);
      } else {
        saveBlob(await exportSenses(api, toFilter(values, true)), `senses-${localDate(new Date())}.csv`);
      }
    } catch (e) {
      setError(errorDetails(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void download();
      }}
      className="flex flex-col gap-4 rounded-panel border-2 border-border p-4"
    >
      {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
      <Checkbox isSelected={withoutSenses} onChange={setWithoutSenses}>
        {t('export.withoutSenses')}
      </Checkbox>
      {withoutSenses && <p className="text-ui text-muted">{t('export.withoutSensesHint')}</p>}
      <FilterFields values={values} onChange={setValues} withStatus />
      <div className="flex justify-end">
        <Button type="submit" isPending={pending}>
          {t('export.download')}
        </Button>
      </div>
    </form>
  );
}
