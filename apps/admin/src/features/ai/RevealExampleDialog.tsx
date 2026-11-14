import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { showToast } from '../../ui/Toast';
import { aiKeys, revealExample, type AiOperation } from './ai-api';

type Props = {
  op: AiOperation;
  /** The held-out example to open; `null` keeps the question closed. */
  exampleId: string | null;
  onClose: () => void;
};

/**
 * "Mở ví dụ held-out?" (design §5.1): the question the admin web must ask before `POST …/examples/:id/reveal`. The example moves to dev
 * and every frozen version records that it was seen; an answer the API refuses (409 it is no longer held-out, 404 it is gone) is shown
 * inside the question and the lists are read again.
 */
export function RevealExampleDialog({ op, exampleId, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const [failure, setFailure] = useState<ErrorDetails | null>(null);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) }),
    queryClient.invalidateQueries({ queryKey: aiKeys.sets(op) }),
    queryClient.invalidateQueries({ queryKey: aiKeys.anySet() }),
  ]);

  const reveal = useMutation({
    mutationFn: (id: string) => revealExample(api, id),
    onMutate: () => setFailure(null),
    onSuccess: async (opened) => {
      await refresh();
      showToast(t(opened.deleted ? 'ai.eval.toast.revealedDeleted' : 'ai.eval.toast.revealed'));
      onClose();
    },
    onError: (e) => {
      setFailure(errorDetails(e));
      if (e instanceof ApiError && (e.problem.status === 409 || e.problem.status === 404)) void refresh();
    },
  });

  function close() {
    setFailure(null);
    onClose();
  }

  return (
    <ConfirmDialog
      isOpen={exampleId !== null}
      title={t('ai.eval.reveal.title')}
      confirmLabel={t('ai.eval.reveal.confirm')}
      isPending={reveal.isPending}
      onConfirm={() => exampleId && reveal.mutate(exampleId)}
      onCancel={close}
    >
      <div className="flex flex-col gap-3">
        <p>{t('ai.eval.reveal.body')}</p>
        {failure && <Banner variant="error" code={failure.code}>{failure.message}</Banner>}
      </div>
    </ConfirmDialog>
  );
}
