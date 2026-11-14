import { cn } from '@/lib/cn';

/**
 * The blurred halos of Nguồn dữ liệu and the 404 (M8 Figma B §2.5): radial `--color-wm-glow-*` at full strength, 45 % of it at 55 % of
 * the radius, gone at the edge (`farthest-corner`, so the stops sit at 39 % and 70 %), layer blur 30 = CSS blur 15 px (12 px on a phone,
 * design §8.1). Place it with margins or insets, not `transform`: `drift` hands it to the site motion CSS (`data-wm-halo`), which moves it
 * with `transform`.
 */
export function Halo({ tone, drift, className }: { tone: 'accent' | 'mark'; drift?: '404-accent' | '404-mark'; className: string }) {
  return (
    <div
      aria-hidden
      data-wm-halo={drift}
      className={cn(
        'pointer-events-none absolute -z-10 rounded-full bg-radial via-39% to-transparent to-70% blur-wm-md',
        tone === 'accent' ? 'from-wm-glow-accent via-wm-glow-accent/45' : 'from-wm-glow-mark via-wm-glow-mark/45',
        HALO_BLUR,
        className,
      )}
    />
  );
}

// raw-ok: Figma's layer blur 30 is a CSS blur of 15 px, above the 12 px phone cap, so it only applies from md
const HALO_BLUR = 'md:blur-[15px]';
