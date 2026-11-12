'use client';

import { shownPos } from '@/lib/pos';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { GROUPS_KEY, useGroupMutations, useGroups } from '../groups/groups-api';
import { fullGroupId, type QuickAddBody, type QuickAddResult } from './add-word-api';
import { GroupPicker, SelectedCount } from './GroupPicker';
import { readLastGroups, writeLastGroups } from './last-group';

type Sense = { sense_id: string; lemma: string; pos: string; meaning: { text: string } };

/**
 * K/42, M/52, QP1: save one known meaning to one or more decks (`POST /quick-add` [I], all decks in one transaction); a typed name
 * that matches nothing is created first and is then the only deck.
 */
export function DeckPickerDialog({ sense, onClose }: { sense: Sense; onClose: () => void }) {
  const t = useTranslations('App.addWord');
  const tw = useTranslations('App.word');
  const tc = useTranslations('App.common');
  const locale = useLocale();
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const groups = useGroups().data?.items ?? [];
  const { createGroup } = useGroupMutations();
  const [lastGroups] = useState(readLastGroups);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const newName = useRef<string | null>(null);
  const decks = chosen ?? lastGroups.filter((id) => groups.some((g) => g.id === id));
  const nameOf = (id: string) => groups.find((g) => g.id === id)?.name ?? '';

  const save = useSubmitOnce(async (key) => {
    let target = decks;
    if (newName.current) {
      const created = await createGroup(newName.current, `${key}:deck`);
      target = [created.id];
      setChosen(target);
      setUnmatched(null);
    }
    const body: QuickAddBody = { group_ids: target, sense_id: sense.sense_id };
    const result = await api.post<QuickAddResult>('/v1/quick-add', body, { idempotencyKey: `${key}:add` });
    return { result, target, names: newName.current ? [newName.current] : target.map(nameOf) };
  });
  const create = useSubmitOnce((key) => createGroup(newName.current!, key));

  async function onSave(createName: string | null) {
    setError(null);
    newName.current = createName;
    try {
      const done = await save.submit(JSON.stringify([sense.sense_id, decks, createName]));
      if (!done) return;
      writeLastGroups(done.target);
      showToast(tw(done.result.created_item ? 'added' : 'alreadyIn', { word: sense.lemma, group: done.names.join(', ') }), 'success', {
        link: { label: t('openGroup'), href: `/${locale}/app/group?id=${done.target[0]}` },
      });
      void client.invalidateQueries({ queryKey: ['items'] });
      void client.invalidateQueries({ queryKey: ['group'] });
      void client.invalidateQueries({ queryKey: GROUPS_KEY });
      onClose();
    } catch (failure) {
      const full = fullGroupId(failure);
      setError(full !== null ? t('fullNotSaved', { group: nameOf(full) }) : errorText(failure));
    } finally {
      newName.current = null;
    }
  }

  async function onCreate(name: string) {
    newName.current = name;
    try {
      const created = await create.submit();
      if (created) setChosen([...decks, created.id]);
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
      closeLabel={tc('close')}
      isDismissable={!save.busy}
      footer={
        <>
          <TextButton tone="muted" onPress={onClose}>
            {tc('cancel')}
          </TextButton>
          {unmatched ? (
            <Button isPending={save.busy} onPress={() => void onSave(unmatched)}>
              {t('createAndSave')}
            </Button>
          ) : (
            decks.length > 0 && (
              <Button isPending={save.busy} onPress={() => void onSave(null)}>
                {t('saveToCount', { count: decks.length })}
              </Button>
            )
          )}
          <SelectedCount count={decks.length} />
        </>
      }
    >
      <p className="w-fit break-words rounded-wm-key bg-wm-mark px-1.5 py-0.5 font-wm-sans text-wm-small text-wm-mark-ink">
        <b className="font-semibold">{sense.lemma}</b>{shownPos(sense.pos) && `, ${shownPos(sense.pos)}`}: {sense.meaning.text}
      </p>
      <GroupPicker
        groups={groups}
        value={decks}
        onChange={(ids) => {
          setChosen(ids);
          setError(null);
        }}
        onCreate={(name) => void onCreate(name)}
        onUnmatched={setUnmatched}
        recentIds={lastGroups}
        onConfirm={() => void onSave(null)}
      />
      {error && (
        <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
          {error}
        </p>
      )}
    </Dialog>
  );
}
