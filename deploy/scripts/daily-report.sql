-- One row of totals for the day before today in Asia/Ho_Chi_Minh (deploy runbook M7). Run by daily-report.sh with
-- psql -v budget_key=<MAIL_BUDGET_KEY>. Mail is counted per UTC day (mail_budget_buckets keys are <key>:<UTC yyyy-mm-dd>).
WITH day AS (
  SELECT d AS local_date,
         d::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS starts,
         (d + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS ends,
         (d - 6)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS week_starts
  FROM (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1 AS d) x
),
members_7d AS (
  SELECT u.id, (u.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS reg_day
  FROM users u, day
  WHERE u.email_verified_at IS NOT NULL
    AND u.staff_role IS NULL
    AND u.created_at >= day.week_starts
    AND u.created_at < day.ends
)
SELECT
  day.local_date AS day,
  (SELECT count(*) FROM users u WHERE u.created_at >= day.starts AND u.created_at < day.ends) AS new_accounts,
  (SELECT count(DISTINCT a.user_id) FROM learning_activity_days a WHERE a.local_date = day.local_date AND a.studied) AS learners_who_studied,
  (SELECT count(*) FROM practice_sessions p WHERE p.started_at >= day.starts AND p.started_at < day.ends) AS practice_sessions,
  (SELECT count(*) FROM ai_calls c WHERE c.created_at >= day.starts AND c.created_at < day.ends) AS ai_calls,
  (SELECT round(coalesce(sum(c.cost_usd), 0)::numeric, 4) FROM ai_calls c WHERE c.created_at >= day.starts AND c.created_at < day.ends) AS ai_cost_usd,
  (SELECT count(*) FROM billing_orders o WHERE o.status = 'paid' AND o.created_at >= day.starts AND o.created_at < day.ends) AS paid_orders,
  (SELECT coalesce(sum(o.amount_minor), 0) FROM billing_orders o
     WHERE o.status = 'paid' AND o.created_at >= day.starts AND o.created_at < day.ends) AS paid_amount_minor,
  (SELECT count(*) FROM billing_orders o WHERE o.status = 'needs_review') AS needs_review_orders,
  (SELECT count(*) FROM billing_orders o WHERE o.status = 'paid' AND o.review_reason IS NOT NULL) AS paid_flagged_orders,
  (SELECT count(*) FROM billing_events e WHERE e.status = 'failed') AS failed_billing_events,
  (SELECT count(*) FROM billing_events e
     WHERE e.status = 'ignored' AND e.error IN ('unknown-order', 'link-mismatch')
       AND CASE
         WHEN split_part(e.external_event_id, ':', 1) ~ '^[0-9]{1,18}$'
         THEN split_part(e.external_event_id, ':', 1)::bigint >= 1100000000
         ELSE false
       END
       AND e.received_at > now() - interval '24 hours') AS ignored_payment_events_24h,
  (SELECT coalesce(sum(m.sent), 0) FROM mail_budget_buckets m
     WHERE m.bucket = :'budget_key' || ':' || to_char(day.local_date, 'YYYY-MM-DD')) AS mails_sent,
  (SELECT count(*) FROM members_7d) AS pilot_members_7d,
  (SELECT count(*) FROM members_7d m
     WHERE EXISTS (
       SELECT 1 FROM learning_activity_days a
       WHERE a.user_id = m.id AND a.studied AND a.local_date <= m.reg_day + 1
     )) AS pilot_activated_7d,
  (SELECT count(*) FROM billing_orders o WHERE o.created_at >= day.week_starts AND o.created_at < day.ends) AS pilot_orders_created_7d,
  (SELECT count(*) FROM billing_orders o WHERE o.status = 'paid' AND o.created_at >= day.week_starts AND o.created_at < day.ends) AS pilot_orders_paid_7d,
  (SELECT count(*) FROM practice_sessions p WHERE p.started_at >= day.week_starts AND p.started_at < day.ends) AS pilot_sessions_7d,
  (SELECT count(*) FROM practice_sessions p WHERE p.started_at >= day.week_starts AND p.started_at < day.ends AND p.ai_planned > 0) AS pilot_ai_sessions_7d
FROM day;
