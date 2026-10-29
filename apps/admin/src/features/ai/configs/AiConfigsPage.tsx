import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../../api/use-error-message';
import { useUrlFilters } from '../../../api/use-url-filters';
import { userLabel } from '../../../api/user-ref';
import { useApi } from '../../../auth/session-context';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { ListState } from '../../../ui/ListState';
import { Select } from '../../../ui/Select';
import {
  AI_OPERATION_ORDER, aiKeys, createDraft, getConfigs, listModels, listSets, type AiModel, type AiOperation, type ConfigsView, type EvalSet, type PromptRevision,
} from '../ai-api';
import { PromptHistory, RevisionContent } from '../PromptHistory';
import { useAiFormat } from '../useAiFormat';
import { DraftEditor } from './DraftEditor';

const FILTERS = { op: { default: 'generate_cloze', valid: (value: string) => (AI_OPERATION_ORDER as readonly string[]).includes(value) } };

/**
 * `/ai/configs?op=` (admin only): what runs now for one AI operation, the draft being prepared and the prompt history from before configs. A config is
 * the prompt, its examples, the model and its settings as one versioned unit (nhóm B design §6).
 */
export function AiConfigsPage() {
  const t = useTranslations();
  const api = useApi();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const op = filters.op as AiOperation;
  const configs = useQuery({ queryKey: aiKeys.configs(op), queryFn: () => getConfigs(api, op) });
  const models = useQuery({ queryKey: aiKeys.models(), queryFn: () => listModels(api) });
  // The newest frozen version is what a run of the draft takes; a failed read only leaves the run button off.
  const sets = useQuery({ queryKey: aiKeys.sets(op), queryFn: () => listSets(api, op) });
  const items = AI_OPERATION_ORDER.map((id) => ({ id, label: `${t(`ai.operations.names.${id}`)} (${id})` }));
  const newestSet = (sets.data?.items ?? []).reduce<EvalSet | null>((best, set) => (best === null || set.version > best.version ? set : best), null);

  const failed = configs.isError && !configs.data ? configs : models.isError && !models.data ? models : null;
  let body;
  if (failed) {
    body = failed.error instanceof ApiError && failed.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void failed.refetch()} />;
  } else if (!configs.data || !models.data) body = <ListState state="loading" />;
  // Keyed by operation: switching never carries one operation's edits into another's.
  else body = <ConfigsBody key={op} op={op} view={configs.data} models={models.data.items} newestSet={newestSet} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full max-w-sm">
        <Select label={t('ai.configs.operation')} items={items} value={op} onChange={(value) => setFilters({ op: value })} />
      </div>
      {body}
    </div>
  );
}

type BodyProps = { op: AiOperation; view: ConfigsView; models: AiModel[]; newestSet: EvalSet | null };

function ConfigsBody({ op, view, models, newestSet }: BodyProps) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const format = useAiFormat();
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  /** The editor puts a revision of the old prompt history into its form through this. */
  const copyRef = useRef<((revision: PromptRevision) => void) | null>(null);
  const { live, draft } = view;

  const create = useMutation({
    mutationFn: () => createDraft(api, op, {}),
    onMutate: () => setProblem(null),
    onSuccess: (created) => queryClient.setQueryData<ConfigsView>(aiKeys.configs(op), (old) => old && { ...old, draft: created }),
    onError: (e) => {
      // Somebody else made a draft first: read again so it shows.
      if (e instanceof ApiError && e.problem.slug === 'draft-exists') void queryClient.invalidateQueries({ queryKey: aiKeys.configs(op) });
      setProblem(errorDetails(e));
    },
  });

  const none = t('ai.eval.detail.none');
  const rows: Array<[string, string]> = live.model
    ? [
        [t('ai.operations.row.model'), `${t(`ai.providers.${live.model.provider}`)} · ${live.model.model_id}`],
        [t('ai.operations.row.effort'), live.effort ?? t('ai.operations.row.effortDefault')],
        [t('ai.operations.row.thinking'), live.thinking === 'off' ? t('ai.operations.row.thinkingOff') : t('ai.operations.row.thinkingDefault')],
        [t('ai.operations.row.maxTokens'), live.max_output_tokens === null ? none : format.number(live.max_output_tokens)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="config-live" className="flex flex-col gap-3 rounded-panel border-2 border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <h2 id="config-live" className="text-lg font-bold text-ink">{t('ai.configs.live.title', { number: live.number })}</h2>
            {live.published_at && live.published_by_user && (
              <span className="text-xs text-muted wrap-anywhere">
                {t('ai.configs.live.publishedBy', { at: format.dateTime(live.published_at), by: userLabel(live.published_by_user, t) })}
              </span>
            )}
          </span>
          {!draft && <Button onPress={() => create.mutate()} isPending={create.isPending}>{t('ai.configs.draft.create')}</Button>}
        </div>
        {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
        {live.model ? (
          <dl className="flex min-w-0 flex-col gap-2 text-ui">
            {rows.map(([label, value]) => (
              <div key={label} className="flex min-w-0 gap-4">
                <dt className="w-40 shrink-0 text-muted">{label}</dt>
                <dd className="min-w-0 text-ink wrap-anywhere">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Banner variant="info">{t('ai.configs.live.noModel')}</Banner>
        )}
        <details className="min-w-0">
          <summary className="cursor-pointer text-ui font-medium text-primary">{t('ai.configs.live.content')}</summary>
          <div className="mt-3">
            <RevisionContent instructions={live.instructions} examples={live.examples} />
          </div>
        </details>
      </section>

      {draft && (
        // Keyed by the draft: a deleted draft followed by a new one is a new editor, never the old one's text.
        <DraftEditor
          key={draft.id}
          op={op}
          initial={draft}
          inputFields={view.input_fields}
          guard={view.guard}
          models={models}
          newestSet={newestSet}
          copyRef={copyRef}
        />
      )}

      <PromptHistory
        op={op}
        title={t('ai.configs.oldPrompts')}
        note={t('ai.configs.oldPromptsNote')}
        onCopy={draft ? (revision) => copyRef.current?.(revision) : undefined}
      />
    </div>
  );
}
