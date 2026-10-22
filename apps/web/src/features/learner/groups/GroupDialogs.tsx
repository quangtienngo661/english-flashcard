'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useAppConfig } from '@/app-shell/queries';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { TextField } from '@/app-ui/TextField';
import { showToast } from '@/app-ui/Toast';
import { GROUP_NAME_MAX } from './group-name';
import { groupError, useGroup, useGroupMutations } from './groups-api';

type Target = { id: string; name: string; version: number };
type Open = { kind: 'create' } | { kind: 'rename'; group: Target } | { kind: 'delete'; group: Target; leaveTo?: string };

/** One place that opens the deck dialogs (K/17, K/17b, K/14); a screen renders `dialogs` once and calls `open`. */
export function useGroupDialogs(): { open: (what: Open) => void; dialogs: ReactNode } {
  const [current, setCurrent] = useState<Open | null>(null);
  const close = () => setCurrent(null);
  const dialogs =
    current === null ? null : current.kind === 'create' ? (
      <CreateGroupDialog onClose={close} />
    ) : current.kind === 'rename' ? (
      <RenameGroupDialog group={current.group} onClose={close} />
    ) : (
      <DeleteGroupDialog group={current.group} leaveTo={current.leaveTo} onClose={close} />
    );
  return { open: setCurrent, dialogs };
}

function useNameError() {
  const t = useTranslations('App.groups');
  const errorText = useErrorMessage();
  const config = useAppConfig();
  return (error: unknown): string => {
    const known = groupError(error);
    if (known?.kind === 'name-taken') return t('nameTaken');
    if (known?.kind === 'limit') return t('limit', { max: config.data?.learning.groups_per_user ?? 100 });
    if (known?.kind === 'conflict') return t('conflict');
    return errorText(error);
  };
}

/** K/17: "Tạo nhóm", 1–60 characters with a counter (Global Constraints of the API). */
export function CreateGroupDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const t = useTranslations('App');
  const nameError = useNameError();
  const { createGroup } = useGroupMutations();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const press = useSubmitOnce(async (key) => createGroup(name.trim(), key));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const group = await press.submit();
      if (!group) return;
      showToast(t('groups.created', { name: group.name }), 'success');
      onCreated?.(group.id);
      onClose();
    } catch (failure) {
      setError(nameError(failure));
    }
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={t('groups.createTitle')} isDismissable={!press.busy}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label={t('groups.nameLabel')}
          placeholder={t('groups.namePlaceholder')}
          value={name}
          onChange={setName}
          maxLength={GROUP_NAME_MAX}
          showCount
          error={error}
          autoFocus
        />
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button variant="quiet" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="sticker" isPending={press.busy} isDisabled={!name.trim()}>
            {t('groups.createSubmit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** K/17b: rename with the deck's version; E18 shows the stored name again after a conflict. */
function RenameGroupDialog({ group, onClose }: { group: Target; onClose: () => void }) {
  const t = useTranslations('App');
  const nameError = useNameError();
  const { renameGroup } = useGroupMutations();
  const latest = useGroup(group.id).data;
  const version = latest?.version ?? group.version;
  const [name, setName] = useState(group.name);
  const [error, setError] = useState<string | undefined>();
  const press = useSubmitOnce(async (key) => renameGroup(group.id, name.trim(), version, key));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      await press.submit();
      showToast(t('groups.renamed'), 'success');
      onClose();
    } catch (failure) {
      if (groupError(failure)?.kind === 'conflict' && latest) setName(latest.name);
      setError(nameError(failure));
    }
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={t('groups.renameTitle')} isDismissable={!press.busy}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label={t('groups.nameLabel')} value={name} onChange={setName} maxLength={GROUP_NAME_MAX} showCount error={error} autoFocus />
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button variant="quiet" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="sticker" isPending={press.busy} isDisabled={!name.trim() || name.trim() === group.name}>
            {t('groups.renameSubmit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** K/14: says how many words leave learning (`removable_items`) before deleting. */
function DeleteGroupDialog({ group, leaveTo, onClose }: { group: Target; leaveTo?: string; onClose: () => void }) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const errorText = useErrorMessage();
  const { deleteGroup } = useGroupMutations();
  const detail = useGroup(group.id).data;
  const removable = detail?.removable_items ?? 0;
  const [error, setError] = useState<string | null>(null);
  const press = useSubmitOnce(async (key) => deleteGroup(group.id, key));

  async function onDelete() {
    setError(null);
    try {
      await press.submit();
      showToast(t('deleted', { name: group.name }), 'success');
      if (leaveTo) hardReplace(leaveTo === 'groups' ? `/${locale}/app/groups` : leaveTo);
      else onClose();
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('deleteTitle', { name: group.name })}
      isDismissable={!press.busy}
      footer={
        <>
          <Button variant="quiet" onPress={onClose}>
            {t('keep')}
          </Button>
          <Button variant="danger" onPress={() => void onDelete()} isPending={press.busy} isDisabled={!detail}>
            {removable > 0 ? t('deleteSubmit', { count: removable }) : t('deleteSubmitNone')}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink">
        {removable > 0 ? t.rich('deleteBody', { count: removable, b: (chunks) => <strong>{chunks}</strong> }) : t('deleteBodyNone')}
      </p>
      <p className="text-caption text-muted">{t('deleteNote')}</p>
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
