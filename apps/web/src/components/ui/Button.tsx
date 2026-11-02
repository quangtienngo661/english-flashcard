import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ink' | 'sticker' | 'quiet' | 'navy';

// Direction B: chunky buttons on a flat ledge that press down on click (design §6.2, landing §5.5).
export const buttonVariants = {
  primary: 'bg-primary text-on-primary shadow-ledge hover:bg-primary/90',
  secondary: 'bg-surface text-ink ring-2 ring-inset ring-border-strong hover:bg-canvas',
  accent: 'bg-accent text-ink shadow-ledge hover:bg-accent/85',
  ink: 'bg-ink text-on-primary hover:bg-ink/90',
  // The learner app's own buttons (app-ui/Button.tsx), for the redesigned landing: sticker = the one yellow action, quiet = secondary.
  sticker: 'bg-accent text-on-accent shadow-ledge-accent hover:bg-accent/90',
  quiet: 'bg-surface text-ink ring-2 ring-inset ring-border-strong shadow-button-secondary hover:bg-primary-soft',
  navy: 'bg-navy-raised text-on-navy hover:bg-navy-raised/80',
} satisfies Record<ButtonVariant, string>;

export const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-6 py-3 text-body font-semibold transition duration-instant ease-standard active:translate-y-1 active:shadow-none motion-reduce:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70';

// ComponentProps includes `ref` (React 19 passes it as a prop): the practice card focuses its next button.
type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({ variant = 'primary', fullWidth, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonBase, buttonVariants[variant], fullWidth && 'w-full', className)} {...props} />;
}
