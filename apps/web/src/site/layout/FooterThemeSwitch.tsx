'use client';

import { Label, Radio, RadioGroup } from 'react-aria-components';
import { useTheme } from '@/app-shell/theme/ThemeProvider';

export const OPTION =
  'inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-wm-pill px-4 font-wm-sans text-wm-small-strong ' +
  'text-wm-muted outline-none transition duration-200 ease-wm-out-strong data-focus-visible:outline-3 data-focus-visible:outline-wm-accent ' +
  'data-selected:bg-wm-surface data-selected:text-wm-ink data-selected:shadow-wm-row';

/**
 * The phone's theme switch, in the footer (owner QM8-1b′ B2: the header has no room for it at 390 px). Light or dark through the same
 * `ThemeProvider` and `wordmet-web.theme` as the header button and the app. Its copy comes as props: public pages send no client messages.
 * Drawn like "Nút chia đoạn" (138:319), with 44 px options.
 */
export function FooterThemeSwitch({ label, light, dark }: { label: string; light: string; dark: string }) {
  const { resolved, setChoice } = useTheme();
  return (
    <RadioGroup
      value={resolved}
      onChange={(value) => setChoice(value === 'dark' ? 'dark' : 'light')}
      orientation="horizontal"
      className="flex items-center gap-3"
    >
      <Label className="font-wm-sans text-wm-small text-wm-muted">{label}</Label>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-wm-pill bg-wm-accent-soft p-1">
        <Radio value="light" className={OPTION}>
          {light}
        </Radio>
        <Radio value="dark" className={OPTION}>
          {dark}
        </Radio>
      </div>
    </RadioGroup>
  );
}
