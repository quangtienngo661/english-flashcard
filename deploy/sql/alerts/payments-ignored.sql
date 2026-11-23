SELECT count(*)::int AS count
FROM billing_events
WHERE status = 'ignored'
  AND error IN ('unknown-order', 'link-mismatch')
  AND split_part(external_event_id, ':', 1) ~ '^[0-9]+$'
  AND split_part(external_event_id, ':', 1)::bigint >= 1100000000
  AND received_at > now() - interval '24 hours';

-- detail
SELECT id, provider, external_event_id, error, received_at
FROM billing_events
WHERE status = 'ignored'
  AND error IN ('unknown-order', 'link-mismatch')
  AND split_part(external_event_id, ':', 1) ~ '^[0-9]+$'
  AND split_part(external_event_id, ':', 1)::bigint >= 1100000000
  AND received_at > now() - interval '24 hours'
ORDER BY received_at DESC
LIMIT 20;
