'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { Select } from '@/app-ui/Select';
import { showToast } from '@/app-ui/Toast';
import { GROUPS_KEY, useGroupMutations, useGroups } from '../groups/groups-api';
import { GROUP_NAME_MAX } from '../groups/group-name';
import { useTopics, type LookupParams } from '../lookup/lookup-api';
import { writeLastGroup } from './last-group';

const NEW = 'new';
export type BulkFilter = Pick<LookupParams, 'level' | 'topic' | 'pos'>;

/**
 * K/43, M/44: every word of the lookup filter into one deck (`POST /groups/{id}/items/bulk {level?, topic?, pos?}` [I]); the
 * API skips function words and words already in the deck and says how many of each.
 */
export function BulkAddSheet({ filter, onClose }: { filter: BulkFilter; onClose: () => void }) {
  const t = useTranslations('App.addWord');
  const tc = useTranslations('App.common');
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const groups = useGroups().data?.items ?? [];
  const topics = useTopics().data?.items ?? [];
  const { createGroup, bulkAdd } = useGroupMutations();
  const [target, setTarget] = useState(NEW);
  const [error, setError] = useState<string | null>(null);
  const topicName = topics.find((tp) => tp.code === filter.topic)?.name ?? filter.topic;
  const summary = [filter.level, topicName, filter.pos].filter(Boolean).join(', ');
  const newName = [topicName, filter.level, filter.pos].filter(Boolean).join(' · ').slice(0, GROUP_NAME_MAX);
  const body = { ...(filter.level ? { level: filter.level } : {}), ...(filter.topic ? { topic: filter.topic } : {}), ...(filter.pos ? { pos: filter.pos } : {}) };

  const save = useSubmitOnce(async (key) => {
    let id = target;
    let name = groups.find((g) => g.id === target)?.name ?? newName;
    if (target === NEW) {
      const deck = await createGroup(newName, `${key}:deck`);
      id = deck.id;
      name = deck.name;
      setTarget(deck.id);
    }
    return { result: await bulkAdd(id, body, `${key}:add`), id, name };
  });

  async function onSubmit() {
    setError(null);
    try {
      const done = await save.submit();
      if (!done) return;
      const { result, id, name } = done;
      writeLastGroup(id);
      showToast(
        `${t('bulkResult', { added: result.added, name })} ${t('bulkSkipped', { already: result.already_in_group, function: result.skipped_function_words, full: result.skipped_group_full })}`,
        'success',
      );
      void client.invalidateQueries({ queryKey: GROUPS_KEY });
      void client.invalidateQueries({ queryKey: ['items'] });
      onClose();
    } catch (failure) {
      setError(errorText(failure));
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('bulkTitle')}
      isDismissable={!save.busy}
      footer={
        <>
          <Button variant="quiet" onPress={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="sticker" isPending={save.busy} onPress={() => void onSubmit()}>
            {t('bulkSubmit')}
          </Button>
        </>
      }
    >
      <p className="-mt-2 text-caption text-muted">{t('bulkBody', { filters: summary })}</p>
      <Select
        label={t('bulkInto')}
        value={target}
        onChange={setTarget}
        items={[{ id: NEW, label: t('bulkNewDeck', { name: newName }) }, ...groups.map((g) => ({ id: g.id, label: g.name }))]}
      />
      <p className="text-caption text-muted">{t('bulkNote')}</p>
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
