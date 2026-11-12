'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Radio, RadioGroup } from 'react-aria-components';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { LockedFeature } from '@/app-ui/Locked';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { HelpTip } from '@/ui/HelpTip';
import { Dialog } from '@/ui/Dialog';
import { Segmented } from '@/ui/Segmented';
import { Select } from '@/ui/Select';
import { Stepper } from '@/ui/Stepper';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE, TextButton } from '@/ui/TextButton';
import type { GroupSummary } from '../groups/groups-api';
import { STAGE_KEYS } from '../groups/stages';
import { refillKind } from '../settings/refill';
import { readOwnSentencesOn, writeOwnSentencesOn } from './own-sentences';
import {
  DEFAULT_SORT,
  SORTS,
  useWeakGroups,
  type AiStartProblem,
  type GroupFilter,
  type PromptStyle,
  type QuestionType,
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
  /** A start with AI questions refused (K/71, K/72, E24); cleared when the learner drops the AI questions. */
  aiProblem: AiStartProblem | null;
  onClearAiProblem: () => void;
};

type Filter = 'all' | 'due' | 'priority';
type McPick = 'meaning' | 'word' | 'mixed';
const STAGE_DOT = ['bg-wm-stage-0-dot', 'bg-wm-stage-1-dot', 'bg-wm-stage-2-dot', 'bg-wm-stage-3-dot', 'bg-wm-stage-4-dot', 'bg-wm-stage-5-solid'] as const;
const SOURCE_NAME: Record<Source, string> = { today: 'hero.title', group: 'sources.group.name', weak: 'sources.weak.name', priority: 'sources.priority.name', all: 'sources.all.name' };
/** #249 defaults, for an API that does not send the new fields yet. */
const SCOPE_MAX = 100;

const todayWords = (g: GroupSummary) => g.today.priority + g.today.due + g.today.new;

/**
 * K/54, K/70 "Tùy chỉnh phiên", round 14 (Figma 131:3890 / dialog 140:4049, phone sheet 141:4147, states 131:4522): the words on the
 * left (group, word filter, one stage), the question types and "Câu AI viết" on the right, the count, order and start at the foot.
 */
export function CustomizeDialog({ target, onClose, ...rest }: Props) {
  const t = useTranslations('App.practice');
  const tc = useTranslations('App.common');
  if (!target) return null;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!rest.busy}
      size={target.source === 'group' || target.source === 'weak' ? 'xl' : 'lg'}
      title={t('customize.title')}
      titleAside={<span className="rounded-wm-key bg-wm-accent-soft px-2 py-0.5 font-wm-sans text-wm-label text-wm-accent">{t(SOURCE_NAME[target.source] as 'hero.title')}</span>}
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
  const tc = useTranslations('App.practice.customize');
  const tStage = useTranslations('App.stages');
  const locale = useLocale();
  const config = useAppConfig().data?.practice;
  const entitlements = useEntitlements().data;
  const sessions = entitlements?.pools.practice_sessions;
  const aiPool = entitlements?.pools.ai_practice;
  const aiAllowed = (entitlements?.features['ai.practice'].allowed ?? false) && aiProblem?.kind !== 'locked';
  const weakGroups = useWeakGroups();
  const { source } = target;
  const hasWords = source === 'group' || source === 'weak';

  const [groupId, setGroupId] = useState(target.groupId ?? (source === 'weak' ? 'all' : groups[0]?.id ?? ''));
  const [filter, setFilter] = useState<Filter>('all');
  const [stage, setStage] = useState<number | null>(null);
  const [mcq, setMcq] = useState(true);
  const [trueFalse, setTrueFalse] = useState(true);
  const [typeWord, setTypeWord] = useState(true);
  const [prompt, setPrompt] = useState<PromptStyle>('mixed');
  const [own, setOwn] = useState(readOwnSentencesOn);
  const [aiCloze, setAiCloze] = useState(true);
  const [aiMc, setAiMc] = useState(true);
  const [mcPick, setMcPick] = useState<McPick>('mixed');
  const [placement, setPlacement] = useState<'even' | 'random'>('even');
  const [aiWanted, setAiWanted] = useState(0);
  const [countWanted, setCountWanted] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT[source]);

  // How many words the scope has: the "N từ" by "Từ", and the most questions in the scope_words mode (#249 §4).
  const group = groups.find((g) => g.id === groupId);
  const weakChosen = weakGroups.data?.items.find((g) => g.group_id === groupId);
  let scopeWords: number;
  if (source === 'group') {
    scopeWords = !group ? 0
      : stage !== null ? (group.cells.find((c) => c.level === stage)?.total ?? 0)
        : filter === 'due' ? todayWords(group) : filter === 'priority' ? group.today.priority : group.total;
  } else if (source === 'weak') scopeWords = weakChosen ? weakChosen.count : (weakGroups.data?.total ?? 0);
  else if (source === 'today') scopeWords = groups.reduce((n, g) => n + todayWords(g), 0);
  else if (source === 'priority') scopeWords = groups.reduce((n, g) => n + g.today.priority, 0);
  else scopeWords = groups.reduce((n, g) => n + g.total, 0);

  const scopeMode = config?.session_max_mode === 'scope_words';
  const sessionMax = scopeMode ? Math.max(1, Math.min(scopeWords, config?.scope_questions_max ?? SCOPE_MAX)) : (config?.max_questions_per_session ?? 20);
  const count = Math.max(1, Math.min(countWanted ?? config?.default_questions_per_session ?? 10, sessionMax));
  const aiCap = config?.ai_max_mode === 'fixed' ? Math.min(config.ai_max_fixed ?? 5, count) : Math.floor((count * (config?.ai_max_percent ?? 50)) / 100);
  const cachedLeft = aiPool?.remaining ?? 0;
  // After a 403 the API's own count of units left wins over the cached one until the entitlements are read again (review I1): the
  // plus stops there and the caption says it, but the learner's own choice stays until they lower it, with the start off.
  const aiLeft = Math.min(cachedLeft, aiProblem?.kind === 'quota' ? aiProblem.remaining : Infinity);
  const aiMax = aiAllowed ? Math.min(aiCap, aiLeft) : 0;
  const ai = Math.min(aiWanted, aiAllowed ? Math.min(aiCap, cachedLeft) : 0);

  const ruleTypes: QuestionType[] = [
    ...(mcq ? ['mcq_definition' as const] : []),
    ...(trueFalse ? ['true_false_definition' as const] : []),
    ...(typeWord ? ['type_word' as const] : []),
  ];
  const aiTypes: QuestionType[] = ai > 0
    ? [
        ...(aiCloze ? ['cloze' as const] : []),
        ...(aiMc && mcPick !== 'word' ? ['meaning_in_sentence' as const] : []),
        ...(aiMc && mcPick !== 'meaning' ? ['mcq_sentence' as const] : []),
      ]
    : [];
  const normalCount = ruleTypes.length + (own ? 1 : 0);
  const types: QuestionType[] = [...ruleTypes, ...(own ? ['cloze' as const] : []), ...aiTypes.filter((type) => !(own && type === 'cloze'))];
  const noTypes = ai === 0 && normalCount === 0;
  const needAi = ai > 0 && aiTypes.length === 0;
  const needRule = !noTypes && ai < count && normalCount === 0;
  const mixed = ai > 0 && own && aiCloze;
  const learnerPlaces = config?.ai_placement === 'learner';
  const placedAs = learnerPlaces ? placement : config?.ai_placement === 'random' ? 'random' : 'even';
  const quotaBlocked = aiProblem?.kind === 'quota' && ai > aiProblem.remaining;
  const noGroup = source === 'group' && groupId === '';

  function dropAi() {
    setAiWanted(0);
    onClearAiProblem();
  }

  function start() {
    const body: StartBody = { source, types };
    if (own) body.cloze_source = mixed ? 'own_then_ai' : 'own';
    if (source === 'group') {
      body.group_id = groupId;
      body.group_filter = stage !== null ? (String(stage) as GroupFilter) : filter;
    }
    if (source === 'weak' && groupId !== 'all') body.group_id = groupId;
    if (typeWord) body.prompt_style = prompt;
    body.count = count;
    if (sort !== DEFAULT_SORT[source]) body.sort = sort;
    body.ai_count = ai;
    if (learnerPlaces && ai > 0) body.ai_placement = placement;
    onStart(body);
  }

  let aiCaption: ReactNode;
  if (!aiAllowed) aiCaption = <LockedFeature />;
  else if (aiLeft === 0)
    aiCaption = (
      <p className="font-wm-sans text-wm-small text-wm-muted">
        {tc('aiOut')}{' '}
        {entitlements?.plan === 'free' && (
          <Link href={`/${locale}/app/plans`} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'inline-flex')}>
            {tc('seePro')}
          </Link>
        )}
      </p>
    );
  else if (aiCap === 0) aiCaption = <p className="font-wm-sans text-wm-small text-wm-muted">{tc('aiNone', { count })}</p>;
  else aiCaption = <p className="font-wm-sans text-wm-small text-wm-muted">{aiLeft < aiCap ? tc('aiMaxLeft', { max: aiMax, left: aiLeft }) : tc('aiMax', { max: aiMax, left: aiLeft })}</p>;

  const wordsColumn = hasWords && (
    <section className="flex min-w-0 flex-col gap-3 md:w-68 md:shrink-0">
      <div className="flex items-center gap-2">
        <h3 className="font-wm-sans text-wm-base-strong text-wm-ink">{tc('words')}</h3>
        <span className="font-wm-sans text-wm-small text-wm-muted">{tc('wordCount', { count: scopeWords })}</span>
        {source === 'group' && group && (
          <div className="ml-auto">
            <Select
              label={tc('stageMenu')}
              hideLabel
              size="sm"
              className="group flex min-w-0 flex-col"
              items={[
                { id: 'all', label: tc('stageAll') },
                ...STAGE_KEYS.map((key, level) => ({
                  id: String(level),
                  label: tc('stageOption', { stage: tStage(key), count: group.cells.find((c) => c.level === level)?.total ?? 0 }),
                  icon: <span aria-hidden className={cn('size-2.5 rounded-wm-key', STAGE_DOT[level])} />,
                })),
              ]}
              value={stage === null ? 'all' : String(stage)}
              display={(item) => (item.id === 'all' ? tc('stageMenu') : tc('stageName', { stage: tStage(STAGE_KEYS[Number(item.id)]) }))}
              onChange={(id) => {
                setStage(id === 'all' ? null : Number(id));
                if (id !== 'all') setFilter('all');
              }}
            />
          </div>
        )}
      </div>
      <RadioGroup aria-label={t('customize.group')} value={groupId} onChange={setGroupId} className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-wm-row bg-wm-bg p-1">
        {source === 'weak' && <GroupRow id="all" label={t('customize.allGroups', { count: weakGroups.data?.total ?? 0 })} name={t('customize.allGroups', { count: weakGroups.data?.total ?? 0 })} />}
        {source === 'weak'
          ? (weakGroups.data?.items ?? []).map((g) => (
              <GroupRow key={g.group_id} id={g.group_id} name={g.name} count={g.count} label={tc('groupRow', { name: g.name, count: g.count })} tone={groupToneOf(groups, g.group_id)} />
            ))
          : groups.map((g) => (
              <GroupRow key={g.id} id={g.id} name={g.name} count={g.total} label={tc('groupRow', { name: g.name, count: g.total })} tone={groupToneOf(groups, g.id)} isDisabled={g.total === 0} />
            ))}
      </RadioGroup>
      {source === 'group' && group && (
        <Segmented<Filter | 'stage'>
          label={tc('filterLabel')}
          fullWidth
          value={stage !== null ? 'stage' : filter}
          options={[
            { id: 'all', label: tc('filterOption', { name: tc('filterAllWords'), count: group.total }) },
            { id: 'due', label: tc('filterOption', { name: tc('filterDue'), count: todayWords(group) }) },
            { id: 'priority', label: tc('filterOption', { name: tc('filterPriority'), count: group.today.priority }) },
          ]}
          onChange={(id) => {
            if (id === 'stage') return;
            setFilter(id);
            setStage(null);
          }}
        />
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className={cn('flex flex-col gap-6', hasWords && 'md:flex-row md:gap-8')}>
        {wordsColumn}
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <h3 className="font-wm-sans text-wm-base-strong text-wm-ink">{tc('questions')}</h3>
          <div className="flex flex-col gap-0.5 rounded-wm-row bg-wm-bg p-1">
            <TypeRow label={t('types.mcq_definition')} on={mcq} onChange={setMcq} />
            <TypeRow label={t('types.true_false_definition')} on={trueFalse} onChange={setTrueFalse} />
            {/* Owner 10/11/2026: a row's own choice stays in place when the row is off, only locked. */}
            <TypeRow label={t('types.type_word')} on={typeWord} onChange={setTypeWord}>
              <Segmented<PromptStyle>
                label={tc('prompt')}
                compact
                isDisabled={!typeWord}
                value={prompt}
                options={[
                  { id: 'meaning', label: tc('promptMeaning') },
                  { id: 'sentence', label: tc('promptSentence') },
                  { id: 'mixed', label: tc('promptMixed') },
                ]}
                onChange={setPrompt}
              />
            </TypeRow>
            <TypeRow
              label={tc('ownToggle')}
              on={own}
              onChange={(on) => {
                setOwn(on);
                writeOwnSentencesOn(on);
              }}
              help={<HelpTip label={tc('ownHelpLabel')}>{mixed ? tc('mixLine') : tc('ownHelp')}</HelpTip>}
            />
          </div>
          {noTypes && <p className={APPEAR_ERROR}>{tc('typesNone')}</p>}

          <div className="mt-2 flex items-center gap-3">
            <h3 className="font-wm-sans text-wm-base-strong text-wm-ink">{tc('aiTitle')}</h3>
            <span className="flex-1" />
            <Stepper
              label={tc('aiTitle')}
              value={ai}
              min={0}
              max={aiMax}
              onChange={(value) => {
                setAiWanted(value);
                if (value === 0) onClearAiProblem();
              }}
            />
          </div>
          {aiCaption}
          <div className={cn('flex flex-col gap-0.5 rounded-wm-row bg-wm-bg p-1 transition-opacity duration-300 ease-out-strong', ai === 0 && 'opacity-45')}>
            <TypeRow label={t('types.cloze')} on={aiCloze} onChange={setAiCloze} isDisabled={ai === 0} />
            <TypeRow label={t('types.mcq_sentence')} on={aiMc} onChange={setAiMc} isDisabled={ai === 0}>
              <Segmented<McPick>
                label={tc('mcPick')}
                compact
                isDisabled={!aiMc || ai === 0}
                value={mcPick}
                options={[
                  { id: 'meaning', label: tc('mcMeaning') },
                  { id: 'word', label: tc('mcWord') },
                  { id: 'mixed', label: tc('mcMixed') },
                ]}
                onChange={setMcPick}
              />
            </TypeRow>
          </div>
          {learnerPlaces && ai > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 motion-safe:animate-feedback-in">
              <span className="font-wm-sans text-wm-small-strong text-wm-ink">{tc('placement')}</span>
              <Segmented<'even' | 'random'>
                label={tc('placement')}
                value={placement}
                options={[
                  { id: 'even', label: tc('placementEven') },
                  { id: 'random', label: tc('placementRandom') },
                ]}
                onChange={setPlacement}
              />
            </div>
          )}
        </section>
      </div>

      {/* The foot stays in view on phones (Figma 141:4147: sticky); count and order move into it from md. */}
      <div className="sticky -bottom-6 -mx-5 -mb-6 flex flex-col gap-3 border-t border-wm-line bg-wm-surface px-5 pb-6 pt-4 shadow-wm-pop md:static md:-mx-7 md:-mb-7 md:px-7 md:pb-7">
        {aiProblem && aiProblem.kind !== 'locked' && <AiProblemBox problem={aiProblem} onDrop={dropAi} />}
        {needAi && <p className={APPEAR_ERROR}>{tc('needAi')}</p>}
        {needRule && <p className={APPEAR_ERROR}>{tc('needRule', { count: count - ai })}</p>}
        {error && (
          <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="whitespace-nowrap font-wm-sans text-wm-small-strong text-wm-ink">{tc('count')}</span>
            <Stepper label={tc('count')} value={count} min={1} max={sessionMax} onChange={setCountWanted} />
            {scopeMode && <span className="whitespace-nowrap text-wm-meta text-wm-muted">{tc('countMaxScope', { max: sessionMax })}</span>}
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="whitespace-nowrap font-wm-sans text-wm-small-strong text-wm-ink">{tc('order')}</span>
            <Select
              label={tc('order')}
              hideLabel
              size="sm"
              items={SORTS.map((id) => ({ id, label: tc(`sorts.${id}`) }))}
              value={sort}
              onChange={(id) => setSort(id as Sort)}
            />
          </div>
          <Button
            variant="primary"
            className="w-full md:ml-auto md:w-auto md:shrink-0"
            isPending={busy}
            isDisabled={noTypes || needAi || needRule || noGroup || quotaBlocked || outLine !== null}
            onPress={start}
          >
            {tc('start', { count })}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
        <p className="font-wm-sans text-wm-small text-wm-muted md:text-right">
          {ai > 0 && `${tc('aiSummary', { count: ai, placement: placedAs === 'random' ? tc('aiSummaryRandom') : tc('aiSummaryEven') })} `}
          {outLine ?? (sessions && sessions.limit > 0 ? tc('sessionsLeft', { remaining: sessions.remaining }) : '')}
        </p>
      </div>
    </div>
  );
}

const groupToneOf = (groups: GroupSummary[], id: string) => {
  const group = groups.find((g) => g.id === id);
  return group ? groupTone(group.id, group.total) : null;
};

/** Figma "Hàng nhóm" (138:339): colour square, name, count, check when chosen. */
function GroupRow({ id, label, name, count, tone, isDisabled }: { id: string; label: string; name: string; count?: number; tone?: { bg: string } | null; isDisabled?: boolean }) {
  return (
    <Radio
      value={id}
      aria-label={label}
      isDisabled={isDisabled}
      className="group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-wm-control px-3 font-wm-sans text-wm-small text-wm-ink outline-none data-disabled:cursor-default data-disabled:opacity-45 data-focus-visible:outline-3 data-focus-visible:outline-wm-accent data-selected:bg-wm-surface data-selected:font-semibold data-selected:shadow-wm-row md:min-h-9"
    >
      {tone ? <span aria-hidden className={cn('size-2.5 shrink-0 rounded-wm-key', tone.bg)} /> : <span aria-hidden className="size-2.5 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {count !== undefined && <span className="text-wm-meta text-wm-muted">{count}</span>}
      <Check aria-hidden className="size-4 shrink-0 text-wm-accent opacity-0 group-data-selected:opacity-100" />
    </Radio>
  );
}

/** Figma "Hàng kiểu câu" (138:398): a checkbox row, with its own choice (a segment) on the right when there is one. */
// Owner 10/11/2026: every row has the same height and surface, ticked or not (only the shadow and the weight mark a ticked one), and
// the change between the two eases in.
function TypeRow({ label, on, onChange, isDisabled, help, children }: {
  label: string; on: boolean; onChange: (on: boolean) => void; isDisabled?: boolean; help?: ReactNode; children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-wm-control bg-wm-surface px-3 py-1.5 transition duration-200 ease-out-strong',
        on && !isDisabled ? 'shadow-wm-row' : 'shadow-none',
      )}
    >
      <span className="flex items-center gap-1">
        <Checkbox isSelected={on} onChange={onChange} isDisabled={isDisabled}>
          <span className={cn(on && 'font-semibold')}>{label}</span>
        </Checkbox>
        {help}
      </span>
      {children}
    </div>
  );
}

/** A red line that appears under a choice eases in (owner 10/11/2026: opening and closing parts should feel smooth). */
const APPEAR_ERROR = 'font-wm-sans text-wm-small-strong text-wm-fail motion-safe:animate-feedback-in';

/** K/71 (not enough AI units: needed, left, when they refill) and K/72 (one general line, D11), right above the start. */
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
    <div role="alert" className="flex flex-col items-start gap-1.5 rounded-wm-row bg-wm-fail-soft p-4 motion-safe:animate-feedback-in">
      {problem.kind === 'quota' ? (
        <>
          <p className="font-wm-sans text-wm-base-strong text-wm-fail">{t('quotaTitle')}</p>
          <p className="font-wm-sans text-wm-small text-wm-ink">{[t('quotaBody', { needed: problem.needed, remaining: problem.remaining }), refill].filter(Boolean).join(' ')}</p>
        </>
      ) : (
        <p className="font-wm-sans text-wm-small text-wm-ink">{t('aiUnavailable')}</p>
      )}
      <TextButton onPress={onDrop}>{t('dropAi')}</TextButton>
    </div>
  );
}
