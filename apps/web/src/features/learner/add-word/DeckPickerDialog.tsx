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
 * that matches nothing is created first and is then the only deck. `inGroups` is the decks the meaning is already in (empty when it
 * is not being learned): quick add's `created_item` only says an item was created, so the toast names the decks not in that list as
 * added, and says "already in" only when every chosen deck was (final review I3).
 */
export function DeckPickerDialog({ sense, inGroups, onClose }: { sense: Sense; inGroups: readonly string[]; onClose: () => void }) {
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
    await api.post<QuickAddResult>('/v1/quick-add', body, { idempotencyKey: `${key}:add` });
    const named = target.map((id) => ({ id, name: newName.current ?? nameOf(id) }));
    const added = named.filter(({ id }) => !inGroups.includes(id));
    return { target, shown: added.length > 0 ? added : named, added: added.length > 0 };
  });
  const create = useSubmitOnce((key) => createGroup(newName.current!, key));

  async function onSave(createName: string | null) {
    setError(null);
    newName.current = createName;
    try {
      const done = await save.submit(JSON.stringify([sense.sense_id, decks, createName]));
      if (!done) return;
      writeLastGroups(done.target);
      showToast(tw(done.added ? 'added' : 'alreadyIn', { word: sense.lemma, group: done.shown.map((g) => g.name).join(', ') }), 'success', {
        link: { label: t('openGroup'), href: `/${locale}/app/group?id=${done.shown[0].id}` },
      });
      void client.invalidateQueries({ queryKey: ['items'] });
      void client.invalidateQueries({ queryKey: ['group'] });
      void client.invalidateQueries({ queryKey: GROUPS_KEY });
      onClose();
    } catch (failure) {
      const full = fullGroupId(failure);
      setError(full === null ? errorText(failure) : nameOf(full) ? t('fullNotSaved', { group: nameOf(full) }) : t('fullUnknown'));
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
      {/* Owner 13/11/2026: plain text, no yellow highlight. */}
      <p className="break-words font-wm-sans text-wm-small text-wm-ink">
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
