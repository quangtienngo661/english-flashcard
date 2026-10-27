import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { showToast } from '../../ui/Toast';
import { useSubmitAction } from '../content/useSubmitAction';
import { acceptForm, ignoreForm, listUnknownForms, undoForm, type UnknownForm } from './unknown-forms-api';

/** An empty page that still has a next page is fetched on, this many pages in a row at most (design §6.9). */
const MAX_EMPTY_PAGES = 5;
const KEY = ['unknown-forms'];

/** [Nhận dạng này]: one `Idempotency-Key` per row; on success the toast offers to take the form back. */
function AcceptButton({ row, onChanged }: { row: UnknownForm; onChanged: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const message = useErrorMessage();
  const names = { form: row.form, lemma: row.lemma_key };
  const action = useSubmitAction(
    (key) => acceptForm(api, { lemma: row.lemma_key, form: row.form }, key),
    `${row.lemma_key}\u0000${row.form}`,
    (added) => {
      showToast(t('unknownForms.accepted', names), {
        label: t('unknownForms.undo'),
        onPress: () => {
          void undoForm(api, added.id)
            .then(() => showToast(t('unknownForms.undone', names)))
            .catch((e: unknown) => showToast(message(e)))
            .finally(onChanged);
        },
      });
      onChanged();
    },
  );
  // The API says it is already there: say so in a toast (the row, and its inline notice, goes with the reload), once.
  const exists = action.problem?.slug === 'word-form-exists';
  const latest = useRef({ onChanged, text: action.error?.message ?? '' });
  useEffect(() => {
    latest.current = { onChanged, text: action.error?.message ?? '' };
  });
  useEffect(() => {
    if (!exists) return;
    showToast(latest.current.text);
    latest.current.onChanged();
  }, [exists]);

  return (
    <span className="flex flex-col items-start gap-1">
      <Button variant="secondary" isPending={action.pending} aria-label={t('unknownForms.acceptFor', names)} onPress={() => void action.submit()}>
        {t('unknownForms.accept')}
      </Button>
      {action.error && (
        <span role="alert" className="text-xs text-danger">
          {action.error.message}
        </span>
      )}
    </span>
  );
}

function IgnoreButton({ row, onChanged }: { row: UnknownForm; onChanged: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const message = useErrorMessage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ignore() {
    setPending(true);
    setError(null);
    try {
      await ignoreForm(api, row.id);
      onChanged();
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        isPending={pending}
        aria-label={t('unknownForms.ignoreFor', { form: row.form, lemma: row.lemma_key })}
        onPress={() => void ignore()}
      >
        {t('unknownForms.ignore')}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

/** A/77, A/77b `/unknown-forms` (`content.edit`): forms AI used that the word-form table lacks, to accept or ignore. */
export function UnknownFormsPage() {
  const t = useTranslations();
  const api = useApi();
  const dateTime = useDateTime();
  const queryClient = useQueryClient();

  const list = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => listUnknownForms(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const pages = list.data?.pages ?? [];
  const rows = pages.flatMap((p) => p.items);

  // The API drops forms the table already knows after it has cut the page, so a page can come back empty with more behind it.
  let trailingEmpty = 0;
  for (let i = pages.length - 1; i >= 0 && pages[i]!.items.length === 0; i -= 1) trailingEmpty += 1;
  // A failed page ends the run: the error state with [Thử lại] shows instead of asking for the same page again.
  const mayFetchOn = rows.length === 0 && trailingEmpty > 0 && trailingEmpty < MAX_EMPTY_PAGES && list.hasNextPage && !list.isError;
  const fetchOn = mayFetchOn && !list.isFetching;
  const { fetchNextPage } = list;
  useEffect(() => {
    if (fetchOn) void fetchNextPage();
  }, [fetchOn, trailingEmpty, fetchNextPage]);

  const changed = () => void queryClient.invalidateQueries({ queryKey: KEY });

  const columns: Column<UnknownForm>[] = [
    { key: 'lemma', header: t('unknownForms.cols.lemma'), className: 'wrap-anywhere font-semibold', cell: (r) => r.lemma_key },
    { key: 'form', header: t('unknownForms.cols.form'), className: 'wrap-anywhere', card: 'field', cell: (r) => r.form },
    { key: 'rejected', header: t('unknownForms.cols.rejected'), className: 'whitespace-nowrap', card: 'field', cell: (r) => r.rejected_count },
    { key: 'first', header: t('unknownForms.cols.first'), className: 'whitespace-nowrap', card: 'field', cell: (r) => dateTime(r.first_seen_at) },
    { key: 'last', header: t('unknownForms.cols.last'), className: 'whitespace-nowrap', card: 'field', cell: (r) => dateTime(r.last_seen_at) },
    {
      key: 'actions', header: '', card: 'action',
      cell: (r) => (
        <span className="flex flex-wrap items-start gap-2">
          <AcceptButton row={r} onChanged={changed} />
          <IgnoreButton row={r} onChanged={changed} />
        </span>
      ),
    },
  ];

  // Still looking for the first row: the empty state waits until the 5 pages are used up.
  const settling = list.isPending || mayFetchOn;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-ui text-muted">{t('unknownForms.intro')}</p>
      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        columns={columns}
        state={settling ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('unknownForms.empty')}
        emptyHint={t('unknownForms.emptyHint')}
        onRetry={() => void list.refetch()}
      />
      {!settling && (rows.length > 0 || list.hasNextPage) && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          {rows.length > 0 && <p className="text-xs text-muted">{t('list.shown', { count: rows.length })}</p>}
        </div>
      )}
    </div>
  );
}
