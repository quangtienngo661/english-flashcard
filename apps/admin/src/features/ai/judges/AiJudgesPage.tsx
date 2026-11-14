import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../../api/problem';
import { useErrorDetails } from '../../../api/use-error-message';
import { PageActions } from '../../../app/shell-slots';
import { useApi } from '../../../auth/session-context';
import { Badge } from '../../../ui/Badge';
import { Banner } from '../../../ui/Banner';
import { Button } from '../../../ui/Button';
import { DataList, type Column } from '../../../ui/DataList';
import { Dialog } from '../../../ui/Dialog';
import { ListState } from '../../../ui/ListState';
import { TextField } from '../../../ui/TextField';
import { showToast } from '../../../ui/Toast';
import { aiKeys, cloneJudge, listJudges, listModels, type Judge } from '../ai-api';
import { JudgeAgreementPanel } from './JudgeAgreementPanel';
import { JudgeEditor } from './JudgeEditor';
import { sortedOperations } from './judge-form';

/**
 * `/ai/judges` (admin only, nhóm B design §5.4): the judges that score what the AI writes, each as its newest revision. A judge is edited in place
 * below the list (saving adds a revision), cloned to try another model on the same criteria, and measured against the owner's labels.
 */
export function AiJudgesPage() {
  const t = useTranslations();
  const api = useApi();
  const query = useQuery({ queryKey: aiKeys.judges(), queryFn: () => listJudges(api) });
  const models = useQuery({ queryKey: aiKeys.models(), queryFn: () => listModels(api) });
  /** `'new'`, or the id of the judge being edited. */
  const [editing, setEditing] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState<string | null>(null);
  const [cloning, setCloning] = useState<Judge | null>(null);

  const failed = query.isError && !query.data ? query : models.isError && !models.data ? models : null;
  if (failed) {
    return failed.error instanceof ApiError && failed.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void failed.refetch()} />;
  }
  if (!query.data || !models.data) return <ListState state="loading" />;

  const judges = query.data.items;
  const edited = editing === null || editing === 'new' ? undefined : judges.find((judge) => judge.id === editing);
  const measured = measuring === null ? undefined : judges.find((judge) => judge.id === measuring);

  const columns: Column<Judge>[] = [
    {
      key: 'judge', header: t('ai.judges.cols.judge'), className: 'w-1/4 wrap-anywhere',
      cell: (judge) => <span className="font-semibold">{t('ai.judges.name', { name: judge.name, revision: judge.latest.revision })}</span>,
    },
    {
      key: 'operations', header: t('ai.judges.cols.operations'), className: 'wrap-anywhere', card: 'field',
      cell: (judge) => sortedOperations(judge.operations).map((operation) => t(`ai.operations.names.${operation}`)).join(', '),
    },
    {
      key: 'model', header: t('ai.judges.cols.model'), className: 'wrap-anywhere', card: 'field',
      cell: (judge) => (judge.latest.model ? `${t(`ai.providers.${judge.latest.model.provider}`)} · ${judge.latest.model.model_id}` : t('ai.judges.noModel')),
    },
    {
      key: 'state', header: t('ai.judges.cols.state'), className: 'whitespace-nowrap', card: 'field',
      cell: (judge) => <Badge tone={judge.active ? 'success' : 'neutral'}>{t(judge.active ? 'ai.judges.active' : 'ai.judges.inactive')}</Badge>,
    },
    {
      key: 'actions', header: t('ai.judges.cols.actions'), card: 'action',
      cell: (judge) => (
        <span className="flex flex-wrap items-center gap-x-1">
          <Button variant="ghost" aria-label={t('ai.judges.editFor', { name: judge.name })} onPress={() => setEditing(judge.id)}>
            {t('ai.judges.edit')}
          </Button>
          <Button variant="ghost" aria-label={t('ai.judges.cloneFor', { name: judge.name })} onPress={() => setCloning(judge)}>
            {t('ai.judges.clone')}
          </Button>
          <Button variant="ghost" aria-label={t('ai.judges.agreementFor', { name: judge.name })} onPress={() => setMeasuring(judge.id)}>
            {t('ai.judges.agreement')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button onPress={() => setEditing('new')}>{t('ai.judges.add')}</Button>
      </PageActions>
      <DataList rows={judges} rowKey={(judge) => judge.id} columns={columns} state="ready" emptyText={t('ai.judges.empty')} emptyHint={t('ai.judges.emptyHint')} />
      {editing === 'new' && <JudgeEditor key="editor-new" judge={null} models={models.data.items} onClose={() => setEditing(null)} />}
      {/* Keyed by the judge: opening another one is a new editor, never the old one's text. */}
      {edited && <JudgeEditor key={`editor-${edited.id}`} judge={edited} models={models.data.items} onClose={() => setEditing(null)} />}
      {measured && <JudgeAgreementPanel key={`agreement-${measured.id}`} judge={measured} onClose={() => setMeasuring(null)} />}
      {cloning && <CloneJudgeDialog key={cloning.id} judge={cloning} onClose={() => setCloning(null)} />}
    </div>
  );
}

/** "Nhân bản judge": the same criteria and newest revision under a new name, so two models can be compared on one set of labels. */
function CloneJudgeDialog({ judge, onClose }: { judge: Judge; onClose: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const [name, setName] = useState(t('ai.judges.cloneDialog.defaultName', { name: judge.name }));
  const clone = useMutation({
    mutationFn: () => cloneJudge(api, judge.id, { name: name.trim() }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: aiKeys.judges() });
      showToast(t('ai.judges.cloneDialog.done', { name: created.name }));
      onClose();
    },
  });
  const problem = clone.isError ? errorDetails(clone.error) : null;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !clone.isPending && onClose()}
      isDismissable={!clone.isPending}
      title={t('ai.judges.cloneDialog.title')}
      actions={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={clone.isPending}>{t('common.cancel')}</Button>
          <Button onPress={() => clone.mutate()} isPending={clone.isPending} isDisabled={name.trim() === ''}>{t('ai.judges.cloneDialog.confirm')}</Button>
        </>
      }
    >
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      <TextField label={t('ai.judges.cloneDialog.name')} value={name} onChange={setName} maxLength={100} isDisabled={clone.isPending} />
    </Dialog>
  );
}
