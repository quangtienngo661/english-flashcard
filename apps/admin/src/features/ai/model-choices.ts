import type { AiModel } from './ai-api';

/**
 * The models a picker offers (D40, B50): not hidden by the admin and not `retired` by the provider, plus the one currently selected even when it is
 * hidden or retired, so a saved choice never vanishes from its own select. The order is the list's. The API list stays complete; only pickers filter.
 */
export function modelChoices(models: AiModel[], selectedId: string | null): AiModel[] {
  return models.filter((model) => model.id === selectedId || (!model.hidden && model.lifecycle !== 'retired'));
}
