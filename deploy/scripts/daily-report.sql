-- One row of totals for the day before today in Asia/Ho_Chi_Minh (deploy runbook M7). Run by daily-report.sh with
-- psql -v budget_key=<MAIL_BUDGET_KEY>. Mail is counted per UTC day (mail_budget_buckets keys are <key>:<UTC yyyy-mm-dd>).
WITH day AS (
  SELECT d AS local_date,
         d::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS starts,
         (d + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS ends
  FROM (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1 AS d) x
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
  (SELECT coalesce(sum(m.sent), 0) FROM mail_budget_buckets m
     WHERE m.bucket = :'budget_key' || ':' || to_char(day.local_date, 'YYYY-MM-DD')) AS mails_sent
FROM day;
