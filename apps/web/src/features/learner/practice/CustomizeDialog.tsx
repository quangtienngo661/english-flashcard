'use client';

import { ChevronDown, Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { LockedFeature } from '@/app-ui/Locked';
import { Select, type SelectItem } from '@/app-ui/Select';
import { cn } from '@/lib/cn';
import type { GroupSummary } from '../groups/groups-api';
import { refillKind } from '../settings/refill';
import { AiTypesToggle, readAiTypesOn, TypeBox, writeAiTypesOn } from './AiTypesToggle';
import { OwnSentencesToggle, readOwnSentencesOn, writeOwnSentencesOn } from './OwnSentencesToggle';
import {
  AI_TYPES,
  DEFAULT_SORT,
  RULE_TYPES,
  SORTS,
  useWeakGroups,
  type AiStartProblem,
  type AiType,
  type PromptStyle,
  type RuleType,
  type Sort,
  type Source,
  type StartBody,
} from './practice-api';

export type CustomizeTarget = { source: Source; groupId?: string };

type Props = {
  /** The source being set up; null while closed. */
  target: CustomizeTarget | null;
  onClose: () => void;
  groups: GroupSummary[];
  onStart: (body: StartBody) => void;
  busy: boolean;
  error: string | null;
  /** No session left today (K/55): the start is off and `outLine` says when sessions refill. */
  outLine: string | null;
  /** A start with AI types refused (K/71, K/72, E24); cleared when the learner turns AI off. */
  aiProblem: AiStartProblem | null;
  onClearAiProblem: () => void;
};

const FILTERS = ['all', 'due', 'priority'] as const;
const STAGES = ['all', '0', '1', '2', '3', '4', '5'] as const;
const PROMPTS: PromptStyle[] = ['meaning', 'sentence', 'mixed'];
const SOURCE_NAME: Record<Source, string> = { today: 'hero.title', group: 'sources.group.name', weak: 'sources.weak.name', priority: 'sources.priority.name', all: 'sources.all.name' };

/** K/54, K/70 "Tùy chỉnh phiên" in the layout of D10: equal type boxes, no descriptions, no notes, the AI switch under them. */
export function CustomizeDialog({ target, onClose, ...rest }: Props) {
  const t = useTranslations('App.practice');
  const tc = useTranslations('App.common');
  if (!target) return null;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!rest.busy}
      wide
      title={t('customize.title')}
      titleAside={<span className="rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-ink">{t(SOURCE_NAME[target.source] as 'hero.title')}</span>}
      closeLabel={tc('close')}
    >
      <CustomizeForm target={target} {...rest} />
    </Dialog>
  );
}

function CustomizeForm({
  target, groups, onStart, busy, error, outLine, aiProblem, onClearAiProblem,
}: Omit<Props, 'onClose' | 'target'> & { target: CustomizeTarget }) {
  const t = useTranslations('App.practice');
  const config = useAppConfig().data?.practice;
  const entitlements = useEntitlements().data;
  const pool = entitlements?.pools.practice_sessions;
  const aiAllowed = (entitlements?.features['ai.practice'].allowed ?? false) && aiProblem?.kind !== 'locked';
  const weakGroups = useWeakGroups();
  const { source } = target;
  const max = config?.max_questions_per_session ?? 20;
  const [groupId, setGroupId] = useState(target.groupId ?? (source === 'weak' ? 'all' : groups[0]?.id ?? ''));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [stage, setStage] = useState<(typeof STAGES)[number]>('all');
  const [types, setTypes] = useState<Set<RuleType>>(() => new Set(RULE_TYPES));
  const [aiOn, setAiOn] = useState(readAiTypesOn);
  const [ownOn, setOwnOn] = useState(readOwnSentencesOn);
  const [aiTypes, setAiTypes] = useState<Set<AiType>>(() => new Set(AI_TYPES));
  const [prompt, setPrompt] = useState<PromptStyle>('mixed');
  const [count, setCount] = useState(Math.min(config?.default_questions_per_session ?? 10, max));
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT[source]);
  const [showOptions, setShowOptions] = useState(false);
  const typesTitle = useId();
  const optionsId = useId();
  const countId = useId();

  const groupItems: SelectItem[] =
    source === 'weak'
      ? [
          { id: 'all', label: t('customize.allGroups', { count: weakGroups.data?.total ?? 0 }) },
          ...(weakGroups.data?.items ?? []).map((g) => ({ id: g.group_id, label: t('customize.groupOption', { name: g.name, count: g.count }) })),
        ]
      : groups.map((g) => ({ id: g.id, label: t('customize.groupOption', { name: g.name, count: g.total }) }));
  const aiChosen = aiAllowed && aiOn ? AI_TYPES.filter((type) => aiTypes.has(type) && !(ownOn && type === 'cloze')) : [];
  const chosenTypes: StartBody['types'] = [...RULE_TYPES.filter((type) => types.has(type)), ...(ownOn ? ['cloze' as const] : []), ...aiChosen];
  const noTypes = chosenTypes.length === 0;
  // The API's own upper bound (Bước 7 design §6.1 step 4): ceil(count × AI types ÷ types); the session's real number is ≤ this.
  const aiPool = entitlements?.pools.ai_practice;
  const aiUsage = aiChosen.length > 0 && aiPool
    ? { needed: Math.ceil((count * aiChosen.length) / chosenTypes.length), remaining: aiPool.remaining }
    : null;

  function switchAi(on: boolean) {
    setAiOn(on);
    writeAiTypesOn(on);
    if (!on) onClearAiProblem();
  }

  function switchOwn(on: boolean) {
    setOwnOn(on);
    writeOwnSentencesOn(on);
  }

  function chooseAi(type: AiType, on: boolean) {
    setAiTypes((current) => {
      const next = new Set(current);
      if (on) next.add(type);
      else next.delete(type);
      return next;
    });
  }
  const noDeck = source === 'group' && groupId === '';

  function toggle(type: RuleType, on: boolean) {
    setTypes((current) => {
      const next = new Set(current);
      if (on) next.add(type);
      else next.delete(type);
      return next;
    });
  }

  function start() {
    const body: StartBody = { source, types: chosenTypes };
    if (ownOn) body.cloze_source = 'own';
    if (source === 'group') {
      body.group_id = groupId;
      body.group_filter = stage !== 'all' ? stage : filter;
    }
    if (source === 'weak' && groupId !== 'all') body.group_id = groupId;
    if (types.has('type_word')) body.prompt_style = prompt;
    body.count = count;
    if (sort !== DEFAULT_SORT[source]) body.sort = sort;
    onStart(body);
  }

  return (
    <div className="flex flex-col gap-5">
      {(source === 'group' || source === 'weak') && (
        <div className="flex flex-col gap-2">
          <Select label={t('customize.group')} items={groupItems} value={groupId} onChange={setGroupId} />
          {source === 'group' && (
            <div className="grid grid-cols-2 gap-2">
              <Select
                label={t('customize.filter')}
                hideLabel
                items={FILTERS.map((id) => ({ id, label: t(`customize.filter${id === 'all' ? 'All' : id === 'due' ? 'Due' : 'Priority'}`) }))}
                value={filter}
                onChange={(id) => {
                  setFilter(id as (typeof FILTERS)[number]);
                  if (id !== 'all') setStage('all');
                }}
              />
              <Select
                label={t('customize.stage')}
                hideLabel
                items={STAGES.map((id) => ({ id, label: id === 'all' ? t('customize.stageAll') : t('customize.stageN', { n: id }) }))}
                value={stage}
                onChange={(id) => {
                  setStage(id as (typeof STAGES)[number]);
                  if (id !== 'all') setFilter('all');
                }}
              />
            </div>
          )}
        </div>
      )}

      <div role="group" aria-labelledby={typesTitle} className="flex flex-col gap-2">
        <p className="flex items-baseline gap-2">
          <span id={typesTitle} className="text-ui font-semibold text-ink">
            {t('customize.types')}
          </span>
          <span className="text-caption text-muted">{t('customize.typesHint')}</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {RULE_TYPES.map((type) => (
            <TypeBox key={type} type={type} selected={types.has(type)} onChange={(on) => toggle(type, on)} />
          ))}
        </div>
        {noTypes && <p className="text-caption text-danger">{t('customize.typesNone')}</p>}
      </div>

      <AiTypesToggle allowed={aiAllowed} on={aiOn} ownOn={ownOn} onChange={switchAi} chosen={aiTypes} onChoose={chooseAi} usage={aiUsage} />
      {aiProblem?.kind === 'locked' && <LockedFeature />}
      <OwnSentencesToggle on={ownOn} onChange={switchOwn} />

      {types.has('type_word') && (
        <div className="flex flex-col gap-2">
          <p aria-hidden className="flex items-baseline gap-2">
            <span className="text-ui font-semibold text-ink">{t('customize.prompt')}</span>
            <span className="text-caption text-muted">{t('customize.promptHint')}</span>
          </p>
          <Select
            label={t('customize.prompt')}
            hideLabel
            className="flex w-full min-w-0 flex-col gap-1.5 sm:w-56"
            items={PROMPTS.map((id) => ({ id, label: t(`customize.prompt${id === 'meaning' ? 'Meaning' : id === 'sentence' ? 'Sentence' : 'Mixed'}`) }))}
            value={prompt}
            onChange={(id) => setPrompt(id as PromptStyle)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={countId} className="text-ui font-semibold text-ink">
          {t('customize.count')}
        </label>
        <div className="flex items-center gap-3">
          <Button variant="quiet" aria-label={t('customize.less')} className={STEP} isDisabled={count <= 1} onPress={() => setCount((c) => Math.max(1, c - 1))}>
            <Minus aria-hidden className="size-4" />
          </Button>
          <input
            id={countId}
            role="spinbutton"
            inputMode="numeric"
            aria-valuemin={1}
            aria-valuemax={max}
            aria-valuenow={count}
            value={String(count)}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(value)) setCount(Math.min(max, Math.max(1, value)));
            }}
            className="w-12 rounded-sm bg-transparent text-center text-h3 font-extrabold text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button variant="quiet" aria-label={t('customize.more')} className={STEP} isDisabled={count >= max} onPress={() => setCount((c) => Math.min(max, c + 1))}>
            <Plus aria-hidden className="size-4" />
          </Button>
          <span className="text-caption text-muted">{t('customize.countMax', { max })}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-inner bg-canvas px-3 py-2">
        <button
          type="button"
          aria-expanded={showOptions}
          aria-controls={optionsId}
          onClick={() => setShowOptions((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center gap-2 text-ui font-semibold text-ink">
            <ChevronDown aria-hidden className={cn('size-4 transition-transform', showOptions && 'rotate-180')} />
            {t('customize.options')}
          </span>
          <span className="min-w-0 text-right text-caption text-muted">{t('customize.orderSummary', { order: t(`customize.sorts.${sort}`) })}</span>
        </button>
        {showOptions && (
          <div id={optionsId} className="pb-2">
            <Select
              label={t('customize.order')}
              items={SORTS.map((id) => ({ id, label: t(`customize.sorts.${id}`) }))}
              value={sort}
              onChange={(id) => setSort(id as Sort)}
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-6 flex flex-col gap-2 bg-surface px-5 pb-6 pt-2 md:static md:m-0 md:p-0">
        {aiProblem && aiProblem.kind !== 'locked' && <AiProblemBox problem={aiProblem} onDrop={() => switchAi(false)} />}
        {error && (
          <p role="alert" className="text-ui text-danger">
            {error}
          </p>
        )}
        <Button variant="sticker" size="lg" className="w-full" isPending={busy} isDisabled={noTypes || noDeck || outLine !== null} onPress={start}>
          {t('customize.start', { count })}
        </Button>
        {outLine ? (
          <p className="text-center text-caption text-muted">{outLine}</p>
        ) : (
          pool &&
          pool.limit > 0 && <p className="text-center text-caption text-muted">{t('customize.sessionsLeft', { remaining: pool.remaining })}</p>
        )}
      </div>
    </div>
  );
}

const STEP = 'size-9 min-h-0 px-0';

/** K/71 (not enough AI credits: needed, left, when they refill) and K/72 (one general line, D11), right above the start. */
function AiProblemBox({ problem, onDrop }: { problem: Exclude<AiStartProblem, { kind: 'locked' }>; onDrop: () => void }) {
  const t = useTranslations('App.practice.customize');
  const format = useFormat();
  const { state } = useSession();
  const zone = state.status === 'signed-in' ? state.me.timezone : 'UTC';
  let refill = '';
  if (problem.kind === 'quota' && problem.resetsAt) {
    refill = refillKind(problem.resetsAt, new Date(), zone) === 'time'
      ? t('quotaRefillTime', { time: format.resetAt(problem.resetsAt) })
      : t('quotaRefillDate', { date: format.date(problem.resetsAt, 'dayMonth') });
  }
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-inner border-2 border-accent bg-accent-soft p-3">
      {problem.kind === 'quota' ? (
        <>
          <p className="text-ui font-semibold text-ink">{t('quotaTitle')}</p>
          <p className="text-ui text-ink">{[t('quotaBody', { needed: problem.needed, remaining: problem.remaining }), refill].filter(Boolean).join(' ')}</p>
          <p className="text-caption text-muted">{t('quotaHint')}</p>
        </>
      ) : (
        <p className="text-ui text-ink">{t('aiUnavailable')}</p>
      )}
      <Button variant="quiet" onPress={onDrop}>
        {t('dropAi')}
      </Button>
    </div>
  );
}
