import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorMessage } from '../../api/use-error-message';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { showToast } from '../../ui/Toast';
import { createTopic, updateTopic, type TopicView } from '../content/content-api';

const CODE = /^[a-z0-9-]+$/;

/** [Thêm chủ đề] (no `topic`) or [Sửa tên] of one topic (A/89). The code cannot change once made. */
export function TopicDialog({ topic, onClose }: { topic?: TopicView; onClose: () => void }) {
  const t = useTranslations('topics');
  const tc = useTranslations('common');
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [code, setCode] = useState(topic?.code ?? '');
  const [vi, setVi] = useState(topic?.names.vi ?? '');
  const [en, setEn] = useState(topic?.names.en ?? '');
  const [tried, setTried] = useState(false);
  const names = { ...(vi.trim() ? { vi: vi.trim() } : {}), ...(en.trim() ? { en: en.trim() } : {}) };
  const dirty = code !== (topic?.code ?? '') || vi !== (topic?.names.vi ?? '') || en !== (topic?.names.en ?? '');
  const save = useMutation({
    mutationFn: () => (topic ? updateTopic(api, topic.code, { names }) : createTopic(api, { code, names })),
    onSuccess: async (saved) => {
      onClose();
      showToast(topic ? t('renamed', { code: saved.code }) : t('created', { code: saved.code }));
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
  const close = useDialogDirtyClose(dirty && !save.isPending, onClose);
  const exists = save.error instanceof ApiError && save.error.problem.slug === 'topic-exists';
  const codeError = !topic && tried && !CODE.test(code) ? t('codeRule') : exists ? t('exists') : undefined;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && close()}
      title={topic ? t('renameTitle', { code: topic.code }) : t('addTitle')}
      size="md"
      isDismissable={!save.isPending}
      actions={
        <>
          <Button variant="secondary" onPress={close} isDisabled={save.isPending}>
            {tc('cancel')}
          </Button>
          <Button
            isPending={save.isPending}
            onPress={() => {
              setTried(true);
              if (!topic && !CODE.test(code)) return;
              save.mutate();
            }}
          >
            {topic ? t('save') : t('add')}
          </Button>
        </>
      }
    >
      {save.error && !exists && <Banner variant="error">{errorMessage(save.error)}</Banner>}
      {!topic && (
        <TextField label={t('code')} description={t('codeHint')} value={code} onChange={(v) => setCode(v.trim())} error={codeError} spellCheck={false} />
      )}
      <TextField label={t('nameVi')} value={vi} onChange={setVi} />
      <TextField label={t('nameEn')} value={en} onChange={setEn} />
    </Dialog>
  );
}
