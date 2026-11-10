'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAddWord } from '@/features/learner/add-word/add-word-context';

/** The phone "+" of Hôm nay (Figma 117:4712): opens Thêm từ. Only Hôm nay has it (design §5.4). */
export function AddFab() {
  const t = useTranslations('App.chrome');
  const { open } = useAddWord();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label={t('addWord')}
      className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-wm-pill bg-wm-accent text-wm-on-accent shadow-wm-btn outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent motion-safe:active:scale-97 md:hidden"
    >
      <Plus aria-hidden className="size-6" />
    </button>
  );
}
