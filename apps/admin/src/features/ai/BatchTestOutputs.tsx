import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import type { BatchTestItem } from './batches-api';
import { useAiFormat } from './useAiFormat';

/** Expiry must remove content even when a finished batch no longer polls. */
export function BatchTestOutputs({ items }: { items: BatchTestItem[] }) {
  const t = useTranslations();
  const format = useAiFormat();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const expires = items.flatMap((item) => item.held_out || !item.content ? [] : [Date.parse(item.content.expires_at)]);
    const next = Math.min(...expires.filter((at) => at > now));
    if (!Number.isFinite(next)) return;
    // Long retention must not overflow the browser's 32-bit timer; recheck when that bounded timer fires.
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, Math.max(0, next - Date.now() + 1)));
    return () => clearTimeout(timer);
  }, [items, now]);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-ui font-semibold">{t('ai.costs.batches.outputs')}</h3>
      {items.map((item) => {
        // Held-out wins even if a malformed response includes content. Expired bodies are never rendered.
        const content = !item.held_out && item.content && Date.parse(item.content.expires_at) > now ? item.content : null;
        return (
          <div key={item.call_id} className="flex flex-col gap-2 border-t border-border pt-3 text-ui">
            {item.held_out ? <p>{t('ai.costs.batches.heldOut')}</p> : content ? (
              <>
                <p className="text-xs text-muted">{t('ai.costs.batches.expires', { date: format.dateTime(content.expires_at) })}</p>
                <pre aria-label={t('ai.costs.batches.output')} tabIndex={0} className="max-h-80 overflow-auto whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 text-xs">
                  {typeof content.response === 'string' ? content.response : JSON.stringify(content.response, null, 2)}
                </pre>
              </>
            ) : <p className="text-muted">{t('ai.costs.batches.expired')}</p>}
          </div>
        );
      })}
      {items.length === 0 && <p className="text-ui text-muted">{t('ai.costs.batches.expired')}</p>}
    </section>
  );
}
