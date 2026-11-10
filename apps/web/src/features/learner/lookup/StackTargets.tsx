'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { showToast } from '@/ui/Toast';
import { carouselOrder } from '../groups/carousel';
import { GROUPS_KEY, type GroupSummary } from '../groups/groups-api';
import { GroupStack } from '../groups/GroupStack';
import { writeLastGroup } from '../add-word/last-group';

const SHOWN = 6;

/**
 * Figma "Chồng của các nhóm" (85:3618): the first six groups of the Nhóm carousel as small stacks. A press adds the card's sense to
 * that group (`POST /v1/groups/{id}/items` [I], once per press); a group that already has it reads "✓ đã có" and cannot be pressed.
 */
export function StackTargets({ groups, senseId, lemma, inGroups }: {
  groups: GroupSummary[];
  /** The card's sense; `null` while it loads (the stacks wait). */
  senseId: string | null;
  lemma: string;
  /** Groups that already hold the sense (`GET /v1/items`), `null` while unknown. */
  inGroups: string[] | null;
}) {
  const t = useTranslations('App.lookup');
  const tw = useTranslations('App.word');
  const tAdd = useTranslations('App.addWord');
  const locale = useLocale();
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const target = useRef<GroupSummary | null>(null);
  // The order is taken once: an add refreshes the counts, and re-sorting then would move the stacks under the pointer.
  const [order, setOrder] = useState<string[]>([]);
  const ids = carouselOrder(groups).map((g) => g.id);
  const kept = [...order.filter((id) => ids.includes(id)), ...ids.filter((id) => !order.includes(id))];
  if (kept.join() !== order.join()) setOrder(kept);
  const shown = kept.map((id) => groups.find((g) => g.id === id)!).slice(0, SHOWN);
  const save = useSubmitOnce(async (key) => {
    const group = target.current!;
    const result = await api.post<{ created: boolean }>(`/v1/groups/${group.id}/items`, { sense_id: senseId }, { idempotencyKey: key });
    return { result, group };
  });

  async function add(group: GroupSummary) {
    if (!senseId) return;
    target.current = group;
    try {
      const done = await save.submit(`${group.id}:${senseId}`);
      if (!done) return;
      setAdded((prev) => new Set(prev).add(`${group.id}:${senseId}`));
      writeLastGroup(group.id);
      showToast(tw(done.result.created ? 'added' : 'alreadyIn', { word: lemma, group: group.name }), 'success', {
        link: { label: tAdd('openGroup'), href: `/${locale}/app/group?id=${group.id}` },
      });
      for (const queryKey of [['items'], ['group'], GROUPS_KEY]) void client.invalidateQueries({ queryKey });
    } catch (error) {
      showToast(error instanceof ApiError && error.problem.slug === 'group-full' ? tAdd('groupFull', { group: group.name }) : errorText(error), 'danger');
    }
  }

  return (
    <ul className="grid grid-cols-3 gap-x-2.5 gap-y-5">
      {shown.map((group) => {
          const has = added.has(`${group.id}:${senseId}`) || (inGroups?.includes(group.id) ?? false);
          return (
            <li key={group.id} className="flex flex-col items-center gap-2">
              <button
                type="button"
                aria-label={t('addTo', { group: group.name })}
                disabled={has || !senseId || inGroups === null}
                onClick={() => void add(group)}
                className="lk-stack rounded-wm-md text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-wm-accent"
              >
                <GroupStack group={group} size="lookup" depth={1} />
              </button>
              {has ? (
                <span className="text-center font-wm-sans text-wm-caption font-semibold text-wm-pass">{t('hasIt')}</span>
              ) : (
                <span className="text-center font-wm-sans text-wm-caption text-wm-muted">{t('addHere')}</span>
              )}
            </li>
          );
        })}
    </ul>
  );
}
