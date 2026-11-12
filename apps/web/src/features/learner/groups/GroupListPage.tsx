'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { StageBar } from '@/ui/StageBar';
import { TextButton } from '@/ui/TextButton';
import { useAddWord } from '../add-word/add-word-context';
import { carouselOrder, rhythm, stepTo } from './carousel';
import { waiting } from './deck-actions';
import { DeckButtons } from './DeckButtons';
import { ms, rememberRect, token, useFlipFrom } from './flip';
import { GroupCarousel } from './GroupCarousel';
import { useGroupDialogs } from './GroupDialogs';
import { GroupPicker } from './GroupPicker';
import { useGroups, type GroupSummary } from './groups-api';
import { STAGE_KEYS } from './stages';

/** Picking a group further than this jumps with no animation (motion doc §3). */
const JUMP_STEPS = 3;

/** One-letter and arrow keys are ignored while typing or inside a dialog (design §8.5; same filter as `add-word-context.tsx`). */
export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') !== null;
}

/** Nhóm (Figma 82:3213 / 82:3368, design §8.2, §8.5): the "Trượt mờ" carousel, the group picker (F) and the centre group's actions. */
export function GroupListPage() {
  const t = useTranslations('App.groups');
  const tToday = useTranslations('App.today');
  const tCommon = useTranslations('App.common');
  const groups = useGroups();
  const { open, dialogs } = useGroupDialogs();
  const order = carouselOrder(groups.data?.items ?? []);

  return (
    <>
      {groups.isPending ? (
        <div role="status" className="flex flex-col items-center gap-5">
          <span className="sr-only">{tCommon('loading')}</span>
          <Skeleton className="h-11 w-56 self-start" />
          <Skeleton className="h-92 w-72 rounded-wm-dialog" />
        </div>
      ) : groups.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-wm-card bg-wm-surface p-6 shadow-wm-card">
          <p className="text-wm-base text-wm-ink">{tCommon('errorPageTitle')}</p>
          <Button variant="secondary" onPress={() => void groups.refetch()}>
            {tCommon('retry')}
          </Button>
        </div>
      ) : order.length === 0 ? (
        <>
          <Title />
          <section className="flex flex-col items-start gap-3 rounded-wm-card bg-wm-surface p-6 shadow-wm-card md:p-8">
            <h2 className="font-wm-display text-wm-card-title text-wm-ink">{tToday('emptyTitle')}</h2>
            <p className="text-wm-base text-wm-muted">{tToday('emptyBody')}</p>
            <Button size="lg" onPress={() => open({ kind: 'create' })}>
              {tToday('createFirst')}
            </Button>
          </section>
        </>
      ) : (
        <Carousel order={order} onCreate={() => open({ kind: 'create' })} createLabel={t('create')} />
      )}
      {dialogs}
    </>
  );
}

function Title({ children }: { children?: ReactNode }) {
  const t = useTranslations('App.groups');
  return (
    <div className="mb-5 flex flex-col gap-1">
      <h1 className="font-wm-display text-3xl font-extrabold leading-tight tracking-tight text-wm-ink md:text-4xl">{t('title')}</h1>
      {children}
    </div>
  );
}

function Carousel({ order, onCreate, createLabel }: { order: GroupSummary[]; onCreate: () => void; createLabel: string }) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const router = useRouter();
  const [centreId, setCentreId] = useState(order[0].id);
  const [instant, setInstant] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const centreRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Back from Một nhóm: the stack flies back to the centre and the other parts sharpen in.
  useFlipFrom('group-stack-back', centreRef, pageRef, 'wm-carousel-in');
  const found = order.findIndex((g) => g.id === centreId);
  const centre = found === -1 ? 0 : found;
  const group = order[centre];
  const waitingGroups = order.filter((g) => waiting(g) > 0);
  const due = waitingGroups.reduce((sum, g) => sum + waiting(g), 0);

  function goTo(index: number) {
    const target = order[index];
    if (!target || index === centre) return;
    setInstant(Math.abs(stepTo(centre, index, order.length)) > JUMP_STEPS);
    setCentreId(target.id);
    setAnnounce(t('live', { name: target.name, count: waiting(target) }));
  }
  function step(d: number) {
    if (order.length < 2) return;
    goTo((centre + d + order.length) % order.length);
  }
  // Opening (motion doc §3): the centre stack lifts and every other part blurs out in 170 ms, then the page changes and the
  // stack flies to the group head. Reduced motion: the page changes at once.
  const opening = useRef(false);
  function openGroup() {
    const go = () => {
      if (centreRef.current) rememberRect('group-stack', centreRef.current);
      router.push(`/${locale}/app/group?id=${group.id}`);
    };
    if (reduced) return go();
    if (opening.current) return;
    opening.current = true;
    pageRef.current?.classList.add('wm-carousel-out');
    window.setTimeout(go, ms(token('--transition-duration-wm-lift', '170ms')));
  }
  function onOpenLink(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    openGroup();
  }

  // The jump without animation lasts one frame, then transitions come back for the next step.
  useEffect(() => {
    if (!instant) return;
    const frame = requestAnimationFrame(() => setInstant(false));
    return () => cancelAnimationFrame(frame);
  }, [instant]);

  const keys = useRef({ step, openGroup });
  useEffect(() => {
    keys.current = { step, openGroup };
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        keys.current.step(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        keys.current.openGroup();
      } else if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        setPickerOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div ref={pageRef} className="flex flex-col gap-4 md:gap-5">
      <div data-part="0" className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <Title>
          <p className="text-wm-meta text-wm-muted">
            <span className="md:hidden">{t('subtitlePhone', { due, groups: waitingGroups.length })}</span>
            <span className="hidden md:inline">{t('subtitle', { due, groups: waitingGroups.length })}</span>
          </p>
        </Title>
        <div className="mb-5 flex items-center justify-between gap-4 md:justify-end">
          <GroupPicker
            groups={order}
            centreId={group.id}
            isOpen={pickerOpen}
            onOpenChange={setPickerOpen}
            onPick={(id) => goTo(order.findIndex((g) => g.id === id))}
          />
          <TextButton tone="add" onPress={onCreate} className="shrink-0 text-wm-button">
            {createLabel}
          </TextButton>
        </div>
      </div>
      <GroupCarousel groups={order} centre={centre} instant={instant} onStep={step} centreRef={centreRef} onOpen={onOpenLink} />
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <Below key={group.id} group={group} onOpen={onOpenLink} />
    </div>
  );
}

/** "Dưới băng chuyền" (Figma 82:3348): the rhythm bar in the group colour, Học · Ôn, "Xem nhóm →", "Thêm từ" (desktop). */
function Below({ group, onOpen }: { group: GroupSummary; onOpen: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const t = useTranslations('App.groups');
  const tStage = useTranslations('App.stages');
  const locale = useLocale();
  const { open } = useAddWord();
  const tone = groupTone(group.id, group.total);
  return (
    <div data-part="3" className="gcar-rise mx-auto flex w-full max-w-124 flex-col items-center gap-3">
      <p className="text-wm-meta text-wm-muted">{t('rhythm')}</p>
      <StageBar
        aria-label={t('rhythm')}
        className="max-w-105"
        segments={rhythm(group.cells).map((c) => ({
          size: c.total,
          fill: c.due,
          tone: tone.bg,
          label: t('rhythmSegment', { stage: tStage(STAGE_KEYS[c.level]), due: c.due, total: c.total }),
        }))}
      />
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <DeckButtons group={group} buttonClassName="w-27.5 md:w-37" />
        <Link
          href={`/${locale}/app/group?id=${group.id}`}
          prefetch
          onClick={onOpen}
          className="flex min-h-11 items-center text-wm-button text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent"
        >
          {t('open')}
        </Link>
        <TextButton tone="muted" onPress={() => open(undefined, { groupId: group.id })} className={cn('hidden text-wm-button md:inline-flex')}>
          {t('addWord')}
        </TextButton>
      </div>
    </div>
  );
}
