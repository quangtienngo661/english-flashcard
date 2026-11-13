import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Every row starts with a hairline and has 16 px above and below (Figma 120:4295 §1.3). */
export const SETTINGS_ROW = 'border-t border-wm-line py-4';
// raw-ok: phone line 1 is the label column (shrinks) and the control (its own width)
const TWO_COLUMNS = 'grid-cols-[minmax(0,1fr)_auto]';

/**
 * A section card of Cài đặt (Figma 120:4363…): surface, 1 px line, radius 20 (R8), card shadow, padding 24 / 24 / 6 (phone 16 / 16 / 6),
 * a Bricolage Bold 20 heading that the Mục lục moves focus to.
 */
export function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-wm-card border border-wm-line bg-wm-surface px-4 pb-1.5 pt-4 shadow-wm-card md:px-6 md:pt-6"
    >
      <h2 id={`${id}-title`} tabIndex={-1} className="pb-2 font-wm-display text-xl font-bold text-wm-ink outline-none">
        {title}
      </h2>
      {children}
    </section>
  );
}

type RowProps = {
  label?: string;
  hint?: ReactNode;
  value?: ReactNode;
  control?: ReactNode;
  /** The control (a bar, a segmented) takes line 2 on phones instead of sitting beside the label. */
  wide?: boolean;
};

const VALUE = 'min-w-0 font-wm-sans text-wm-button font-normal text-wm-ink wrap-anywhere md:flex-1';

/**
 * One row (Figma §1.3). Desktop: label cell 230 px (label, hint), the value, the control at the right edge. Phone: label and control on
 * line 1, the value (or a `wide` control) on line 2. A row without a label is the value and the control side by side.
 */
export function SettingsRow({ label, hint, value, control, wide = false }: RowProps) {
  if (!label && !hint) {
    return (
      <div className={cn(SETTINGS_ROW, 'flex flex-wrap items-center gap-3 md:gap-5')}>
        {value !== undefined && <div className={cn(VALUE, 'flex-1')}>{value}</div>}
        {control}
      </div>
    );
  }
  return (
    <div className={cn(SETTINGS_ROW, 'grid items-center gap-x-3 gap-y-1.5 md:flex md:gap-5', control && !wide ? TWO_COLUMNS : 'grid-cols-1')}>
      <div className="flex min-w-0 flex-col gap-0.5 md:w-57.5 md:shrink-0">
        {label && <span className="font-wm-sans text-wm-button text-wm-ink">{label}</span>}
        {hint && <span className="font-wm-sans text-wm-caption text-wm-muted">{hint}</span>}
      </div>
      {value !== undefined && <div className={cn(VALUE, 'col-span-full row-start-2')}>{value}</div>}
      {control && (
        <div className={cn('flex min-w-0 items-center md:ml-auto md:shrink-0', wide ? 'col-span-full row-start-2' : 'col-start-2 row-start-1 justify-end')}>
          {control}
        </div>
      )}
    </div>
  );
}
