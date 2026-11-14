import type { AiProviderName, GatewayOperation } from '../ai.types.js';
import type { Price } from './cost.js';
import { resolveMaxOutputTokens } from './run-rules.js';

/** What one run uses (design §6.3), resolved from an operation's config and its model. */
export type Selection = {
  operation: GatewayOperation;
  /** Null for a selection rebuilt from an eval run row. */
  modelRef: string | null;
  provider: AiProviderName;
  modelId: string;
  effort: string | null;
  thinking: 'disabled' | 'between_tools' | null;
  maxOutputTokens: number | null;
  price: Price | null;
};

/** Prisma returns `Decimal` for prices; anything whose string is a number fits. */
type DecimalLike = { toString(): string };

export type ModelRow = {
  id: string;
  provider: string;
  modelId: string;
  thinkingOff: string | null;
  maxOutputTokens: number | null;
  priceInput: DecimalLike | null;
  priceCachedInput: DecimalLike | null;
  priceOutput: DecimalLike | null;
};

type SettingRow = { effort: string | null; thinking: string | null; maxOutputTokens: number | null };

const toNumber = (value: DecimalLike | null): number | null => (value === null ? null : Number(value.toString()));

/** `'off'` becomes the model's own way of turning thinking off; a price needs both the input and the output price. */
export function toSelection(operation: GatewayOperation, setting: SettingRow, model: ModelRow): Selection {
  const provider = model.provider as AiProviderName;
  const input = toNumber(model.priceInput);
  const output = toNumber(model.priceOutput);
  return {
    operation,
    modelRef: model.id,
    provider,
    modelId: model.modelId,
    effort: setting.effort,
    thinking: setting.thinking === 'off' ? (model.thinkingOff as Selection['thinking']) : null,
    maxOutputTokens: resolveMaxOutputTokens(provider, setting.maxOutputTokens, model.maxOutputTokens),
    price: input === null || output === null ? null : { input, cachedInput: toNumber(model.priceCachedInput), output },
  };
}
