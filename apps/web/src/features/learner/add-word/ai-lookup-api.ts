'use client';

import { useRef } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import type { LookupSense } from './add-word-api';

/** `POST /v1/lookup/ai` (Bước 7 §11.1): the AI suggestion, and the dictionary's senses of that lemma first (D21). */
export type AiLookupResult = {
  suggestion: {
    part_of_speech: string;
    lemma: string;
    meaning: { text: string; language: 'vi' | 'en' };
    definition_en: string;
    examples: string[];
  };
  catalog_senses: LookupSense[];
};
export type AiLookupBody = { text: string; context_sentence?: string };

/** The API holds a lookup for 60 s (lease); waiting longer than that for "in progress" is pointless. */
const IN_PROGRESS_MAX_S = 60;
const IN_PROGRESS_RETRY_S = 2;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One lookup per press (Review Focus 1). 409 `ai-in-progress` means the first request still runs: wait `Retry-After` and send
 * the **same** key again (E38), so the learner is charged once.
 */
export function useAiLookup() {
  const api = useApi();
  const body = useRef<AiLookupBody>({ text: '' });
  const once = useSubmitOnce(async (key) => {
    for (let waited = 0; ; ) {
      try {
        return await api.post<AiLookupResult>('/v1/lookup/ai', body.current, { idempotencyKey: key });
      } catch (error) {
        if (!(error instanceof ApiError && error.problem.slug === 'ai-in-progress') || waited >= IN_PROGRESS_MAX_S) throw error;
        const seconds = error.retryAfterSeconds ?? IN_PROGRESS_RETRY_S;
        waited += seconds;
        await sleep(seconds * 1000);
      }
    }
  });
  return {
    busy: once.busy,
    run(next: AiLookupBody) {
      body.current = next;
      // Another word or sentence is another write: the payload decides whether the kept key is reused.
      return once.submit(JSON.stringify(next));
    },
  };
}
