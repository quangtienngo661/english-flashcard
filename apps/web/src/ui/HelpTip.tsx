'use client';

import { CircleHelp } from 'lucide-react';
import { Button, OverlayArrow, Tooltip, TooltipTrigger } from 'react-aria-components';

/**
 * A "?" that explains a choice on hover or keyboard focus (owner 10/11/2026: the explanation of "Điền từ vào câu bạn đã lưu" sits
 * behind an icon by the row, not as a line under it). The tooltip opens at once, next to the icon.
 */
export function HelpTip({ label, children }: { label: string; children: string }) {
  return (
    <TooltipTrigger delay={0} closeDelay={100}>
      <Button
        aria-label={label}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-wm-pill text-wm-muted outline-none hover:text-wm-accent focus-visible:outline-3 focus-visible:outline-wm-accent"
      >
        <CircleHelp aria-hidden className="size-4" />
      </Button>
      <Tooltip
        offset={8}
        className="group max-w-64 rounded-wm-md bg-wm-mark-ink px-3 py-2 font-wm-sans text-wm-small text-wm-on-accent shadow-wm-pop motion-safe:data-entering:animate-feedback-in"
      >
        <OverlayArrow>
          <svg aria-hidden width={10} height={6} viewBox="0 0 10 6" className="fill-wm-mark-ink group-placement-bottom:rotate-180">
            <path d="M0 0 L5 6 L10 0" />
          </svg>
        </OverlayArrow>
        {children}
      </Tooltip>
    </TooltipTrigger>
  );
}
