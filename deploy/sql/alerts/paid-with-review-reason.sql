SELECT count(*)::int AS count
FROM billing_orders
WHERE status = 'paid'
  AND review_reason IS NOT NULL;

-- detail
SELECT id, order_code, review_reason, amount_minor, created_at
FROM billing_orders
WHERE status = 'paid'
  AND review_reason IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
