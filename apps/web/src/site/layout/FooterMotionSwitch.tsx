'use client';

import { useSyncExternalStore } from 'react';
import { Label, Radio, RadioGroup, Text } from 'react-aria-components';
import { motionChoice, onMotionChange, prefersReducedMotion, setMotionChoice } from '../interactive/motion';
import { OPTION } from './FooterThemeSwitch';

const REDUCE = '(prefers-reduced-motion: reduce)';

function subscribeReduced(change: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(REDUCE);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}

/**
 * "Chuyển động: Bật / Tắt" in the footer (T10, QA7): stops the landing's loops for a reader who has not asked the device for less motion
 * (WCAG 2.2.2), remembered under `wordmet-web.motion`. With reduced motion set on the device the motion is off already: the switch shows
 * "Tắt", is disabled and says so. Built like FooterThemeSwitch; its copy comes as props, as public pages send no client messages.
 */
export function FooterMotionSwitch({ label, on, off, deviceNote }: { label: string; on: string; off: string; deviceNote: string }) {
  const choice = useSyncExternalStore(onMotionChange, motionChoice, () => 'on' as const);
  const reduced = useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);
  return (
    <RadioGroup
      value={reduced ? 'off' : choice}
      onChange={(value) => setMotionChoice(value === 'on')}
      isDisabled={reduced}
      orientation="horizontal"
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      <Label className="font-wm-sans text-wm-small text-wm-muted">{label}</Label>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-wm-pill bg-wm-accent-soft p-1">
        <Radio value="on" className={`${OPTION} data-disabled:cursor-default`}>
          {on}
        </Radio>
        <Radio value="off" className={`${OPTION} data-disabled:cursor-default`}>
          {off}
        </Radio>
      </div>
      {reduced && (
        <Text slot="description" className="font-wm-sans text-wm-small text-wm-muted">
          {deviceNote}
        </Text>
      )}
    </RadioGroup>
  );
}
