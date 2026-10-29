/**
 * Who owns what happens to every column that points at a user (design §7.3, D14–D18). Keys are `table.column`.
 * - `erase`: the row goes with the account (or is deleted by its owner module), or the column belongs to the deleted row itself.
 * - `anonymise`: the row stays with a random id (`anonId`) in place of the user id.
 * - `null`: the row stays with the column set to NULL.
 * - `keep-id`: a staff audit trail or an id of someone else; the id stays as an opaque value (D18).
 * `account-data-map.spec.ts` fails when a column named `user_id`, `*_user_id` or `*_by` in `prisma/models/*.prisma` is missing here,
 * so a later Bước that adds one has to decide.
 */
export type Disposition = 'erase' | 'anonymise' | 'null' | 'keep-id';

export const ACCOUNT_DATA_MAP: Record<string, Disposition> = {
  // Identity: the users row and its cascades; locked_by points at a staff member.
  'users.email': 'erase',
  'users.locked_by': 'keep-id',
  'users.deleting_by': 'erase',
  'password_credentials.user_id': 'erase',
  'session_chains.user_id': 'erase',
  'otp_codes.user_id': 'erase',
  'otp_failure_windows.user_id': 'erase',
  'user_identities.user_id': 'erase',
  'deleted_accounts.user_id': 'keep-id',
  // Common
  'idempotency_keys.user_id': 'erase',
  'rate_limit_counters.key': 'keep-id',
  // Settings, pipeline: staff audit
  'app_settings.updated_by': 'keep-id',
  'app_setting_changes.changed_by': 'keep-id',
  'background_jobs.created_by': 'keep-id',
  // Notifications
  'reminder_prefs.user_id': 'erase',
  'reminder_deliveries.user_id': 'erase',
  // Learning
  'learning_groups.user_id': 'erase',
  'learning_items.user_id': 'erase',
  'learning_log.user_id': 'erase',
  // Content: private words and sentences go; staff audit stays
  'entries.owner_user_id': 'erase',
  'context_sentences.user_id': 'erase',
  'senses.state_changed_by': 'keep-id',
  'sense_revisions.created_by': 'keep-id',
  'sense_revisions.reviewed_by': 'keep-id',
  'sense_revisions.published_by': 'keep-id',
  'word_form_additions.added_by': 'keep-id',
  // Entitlements
  'entitlement_grants.user_id': 'erase',
  'entitlement_grants.granted_by': 'keep-id',
  'entitlement_grants.revoked_by': 'keep-id',
  'entitlement_grant_changes.changed_by': 'keep-id',
  'subscriptions.user_id': 'erase',
  'billing_events.app_user_id': 'erase',
  'billing_events.user_id': 'erase',
  'trial_history.user_id': 'erase',
  'billing_transactions.user_id': 'anonymise',
  'usage_records.user_id': 'anonymise',
  'entitlement_notices.user_id': 'erase',
  'entitlement_notices.recipient_user_id': 'erase',
  'fake_billing_subscriptions.user_id': 'erase',
  // Practice
  'practice_sessions.user_id': 'erase',
  'practice_questions.user_id': 'erase',
  'practice_session_items.user_id': 'erase',
  'practice_reports.user_id': 'anonymise',
  'practice_reports.resolved_by': 'keep-id',
  'practice_ai_requests.user_id': 'erase',
  'practice_report_reasons.updated_by': 'keep-id',
  'practice_word_checks.user_id': 'erase',
  // AI
  'ai_models.created_by': 'keep-id',
  'ai_operation_settings.updated_by': 'keep-id',
  'ai_operation_setting_changes.changed_by': 'keep-id',
  'ai_prompts.updated_by': 'keep-id',
  'ai_prompt_revisions.saved_by': 'keep-id',
  'ai_operations.user_id': 'erase',
  'ai_calls.user_id': 'null',
  'ai_eval_examples.created_by': 'keep-id',
  'ai_eval_runs.started_by': 'keep-id',
  'ai_eval_sets.frozen_by': 'keep-id',
  'ai_configs.created_by': 'keep-id',
  'ai_configs.published_by': 'keep-id',
  'ai_config_events.actor_id': 'keep-id',
};
