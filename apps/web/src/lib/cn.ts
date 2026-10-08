import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom font-size tokens so `text-h2` is not mistaken for a text color.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'cta', 'h2', 'title-lg', 'h3', 'title', 'lead', 'subtitle', 'body-lg', 'body', 'label', 'small', 'caption'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
