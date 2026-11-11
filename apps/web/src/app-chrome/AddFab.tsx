'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAddWord } from '@/features/learner/add-word/add-word-context';

/** The phone "+" of Hôm nay (Figma 117:4712): opens Thêm từ. `FloatingButtons` places it under the calendar button, on Hôm nay only (design §5.4). */
export function AddFab() {
  const t = useTranslations('App.chrome');
  const { open } = useAddWord();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label={t('addWord')}
      className="flex size-14 items-center justify-center rounded-wm-pill bg-wm-accent text-wm-on-accent shadow-wm-btn outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent motion-safe:active:scale-97 md:hidden"
    >
      <Plus aria-hidden className="size-6" />
    </button>
  );
}
