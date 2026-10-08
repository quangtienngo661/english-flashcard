import { cn } from '@/lib/cn';

export type IconName = 'chevron-left' | 'chevron-right' | 'check' | 'flag';

const paths = {
  'chevron-left': 'm14 6-6 6 6 6',
  'chevron-right': 'm10 6 6 6-6 6',
  check: 'M5 12.5 10 17 19 7',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
} satisfies Record<IconName, string>;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('size-5 shrink-0', className)}
    >
      <path d={paths[name]} />
    </svg>
  );
}
