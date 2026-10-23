'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { showToast } from '@/app-ui/Toast';
import { GROUPS_KEY, useGroupMutations, useGroups } from '../groups/groups-api';
import { GroupPicker } from './GroupPicker';
import { readLastGroup, writeLastGroup } from './last-group';

type Sense = { sense_id: string; lemma: string; pos: string; meaning: { text: string } };

/** K/42, M/52: save one known meaning to a deck (`POST /groups/{id}/items` [I]); a typed name that matches nothing is created first. */
export function DeckPickerDialog({ sense, onClose }: { sense: Sense; onClose: () => void }) {
  const t = useTranslations('App.addWord');
  const tw = useTranslations('App.word');
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const groups = useGroups().data?.items ?? [];
  const { createGroup } = useGroupMutations();
  const [lastGroup] = useState(readLastGroup);
  const [chosen, setChosen] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const newName = useRef<string | null>(null);
  const deck = chosen ?? (groups.some((g) => g.id === lastGroup) ? lastGroup : null);
  const deckName = groups.find((g) => g.id === deck)?.name ?? '';

  const save = useSubmitOnce(async (key) => {
    let target = deck!;
    let name = deckName;
    if (newName.current) {
      const created = await createGroup(newName.current, `${key}:deck`);
      target = created.id;
      name = created.name;
      setChosen(created.id);
    }
    const result = await api.post<{ created: boolean }>(`/v1/groups/${target}/items`, { sense_id: sense.sense_id }, { idempotencyKey: `${key}:add` });
    return { result, target, name };
  });
  const create = useSubmitOnce((key) => createGroup(newName.current!, key));

  async function onSave(createName: string | null) {
    setError(null);
    newName.current = createName;
    try {
      const done = await save.submit();
      if (!done) return;
      writeLastGroup(done.target);
      showToast(tw(done.result.created ? 'added' : 'alreadyIn', { word: sense.lemma, group: done.name }), 'success');
      void client.invalidateQueries({ queryKey: ['items'] });
      void client.invalidateQueries({ queryKey: GROUPS_KEY });
      onClose();
    } catch (failure) {
      setError(failure instanceof ApiError && failure.problem.slug === 'group-full' ? t('groupFull', { group: deckName }) : errorText(failure));
    } finally {
      newName.current = null;
    }
  }

  async function onCreate(name: string) {
    newName.current = name;
    try {
      const created = await create.submit();
      if (created) setChosen(created.id);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      newName.current = null;
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('pickerTitle')}
      isDismissable={!save.busy}
      footer={
        unmatched ? (
          <Button variant="sticker" isPending={save.busy} onPress={() => void onSave(unmatched)}>
            {t('createAndSave')}
          </Button>
        ) : (
          deck && (
            <Button variant="sticker" isPending={save.busy} onPress={() => void onSave(null)}>
              {t('saveTo', { group: deckName })}
            </Button>
          )
        )
      }
    >
      <p className="-mt-2 w-fit rounded-sm bg-accent-soft px-2 py-0.5 text-caption font-semibold text-ink">
        {sense.lemma}, {sense.pos}: {sense.meaning.text}
      </p>
      <GroupPicker groups={groups} value={deck} onChange={setChosen} onCreate={(name) => void onCreate(name)} onUnmatched={setUnmatched} recentId={lastGroup} />
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
