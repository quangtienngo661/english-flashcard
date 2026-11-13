import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the wm font-size tokens so `text-wm-base` is not mistaken for a text color.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        // The new UI's sizes (packages/design-tokens/web.css).
        {
          text: [
            'wm-hero', 'wm-section', 'wm-lemma', 'wm-card-title', 'wm-logo', 'wm-word', 'wm-lead', 'wm-base', 'wm-base-strong',
            'wm-button', 'wm-small', 'wm-small-strong', 'wm-label', 'wm-caption', 'wm-meta',
            'wm-page-title', 'wm-page-title-mobile', 'wm-app-title', 'wm-app-title-mobile', 'wm-card-heading', 'wm-card-heading-mobile',
            'wm-site-hero', 'wm-site-hero-mobile', 'wm-site-section', 'wm-site-section-mobile', 'wm-site-page', 'wm-site-page-mobile',
            'wm-site-doc-heading', 'wm-block-title', 'wm-block-title-mobile',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
