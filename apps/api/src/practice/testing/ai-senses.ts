// Test fixtures for the AI rule files: a `deploy` sense and candidate senses, as Content's practice reads return them.
import { randomUUID } from 'node:crypto';
import type { CandidateSense, PracticeSense } from '../../content/index.js';

export function candidate(data: Partial<CandidateSense> = {}): CandidateSense {
  const gloss = data.gloss_vi === undefined ? 'nghĩa' : data.gloss_vi;
  return {
    sense_id: randomUUID(), entry_id: randomUUID(), scope: 'catalog', lemma: 'word', gloss_vi: gloss, definition_en: null,
    meaning: { text: gloss ?? '', language: 'vi', translation_missing: false }, form_of_entry_id: null, function_word: false,
    inflections: [], ...data,
  };
}

export function deploy(data: Partial<PracticeSense> = {}): PracticeSense {
  return {
    ...candidate({ lemma: 'deploy', gloss_vi: 'triển khai' }),
    inflections: [
      { form: 'deploys', kind: 'third_person' }, { form: 'deploying', kind: 'present_participle' },
      { form: 'deployed', kind: 'past' }, { form: 'deployed', kind: 'past_participle' },
    ],
    context_label: null, examples: [], variants: [], accepted: [], pos: 'verb', level: 'B1', live_revision_id: randomUUID(),
    extra_forms: [], ...data,
  };
}
