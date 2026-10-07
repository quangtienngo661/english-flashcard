-- @param {String} $1:userId
-- @param {String} $2:purpose
-- @param {DateTime} $3:now
INSERT INTO otp_failure_windows (user_id, purpose, window_start, failures, locked_until)
VALUES ($1::uuid, $2, $3::timestamptz, 1, NULL)
ON CONFLICT (user_id, purpose) DO UPDATE
SET failures = CASE
      WHEN otp_failure_windows.window_start < $3::timestamptz - interval '24 hours' THEN 1
      ELSE otp_failure_windows.failures + 1
    END,
    window_start = CASE
      WHEN otp_failure_windows.window_start < $3::timestamptz - interval '24 hours' THEN $3::timestamptz
      ELSE otp_failure_windows.window_start
    END,
    locked_until = CASE
      WHEN otp_failure_windows.window_start < $3::timestamptz - interval '24 hours' THEN NULL
      ELSE otp_failure_windows.locked_until
    END
RETURNING failures, locked_until;
