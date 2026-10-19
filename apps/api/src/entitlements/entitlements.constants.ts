// Numbers fixed in code (design §13 "cố định trong code"; all ASSUMPTION). Every other number comes from Settings.

/** A reserved AI unit counts as used for this long unless confirmed or released (design §7.1). */
export const RESERVATION_TTL_MS = 120_000;

/** The zone of the system-wide AI cap's day (design §7.3). */
export const AI_DAY_ZONE = 'Asia/Ho_Chi_Minh';

/** Attempts before a billing event is marked failed. */
export const BILLING_MAX_ATTEMPTS = 5;

/** How long a pending billing event waits before the job retries it. */
export const BILLING_PENDING_RETRY_MS = 300_000;

/** `billing_events.raw_payload` is cleared after this many days (R23). */
export const RAW_PAYLOAD_RETENTION_DAYS = 90;

/** Body size limit of the billing webhook. */
export const WEBHOOK_BODY_LIMIT = '64kb';

/** A grant may start at most this far in the past (clock skew between staff and server). */
export const GRANT_START_SKEW_MS = 300_000;

/** Maximum length of a grant's reason, a revoke reason and a date-change reason. */
export const GRANT_REASON_MAX = 300;

/** Every adapter call is bounded by this; a timeout counts as "not supported" / "fetch failed" (R6). */
export const BILLING_ADAPTER_TIMEOUT_MS = 5_000;

/** D39: a subscription revoked by a refund is asked again (fetchState) by the hourly job for this many days (ASSUMPTION). */
export const REFUND_REFETCH_DAYS = 3;
