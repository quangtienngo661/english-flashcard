// Figma "Nút" (3:12): Chính = accent with the navy glow, Phụ = surface with a line and the soft shadow; pass and danger for
// "Đã biết" and destructive actions. No shadow when disabled. Hover brightness(1.12) 200ms, press scale(.97) 150ms (GM14, motion §6).
export type ButtonVariant = 'primary' | 'secondary' | 'pass' | 'danger';

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-wm-accent text-wm-on-accent shadow-wm-btn',
  secondary: 'border border-wm-line bg-wm-surface text-wm-ink shadow-wm-soft',
  pass: 'bg-wm-pass text-wm-on-accent shadow-wm-btn-pass',
  danger: 'bg-wm-fail text-wm-on-accent shadow-wm-btn-fail',
};

export const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-wm-control px-5 font-wm-sans text-wm-button outline-none ' +
  'transition duration-200 ease-wm-out-strong hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-wm-accent motion-safe:active:scale-97 motion-safe:data-pressed:scale-97 motion-safe:data-pressed:duration-150';
