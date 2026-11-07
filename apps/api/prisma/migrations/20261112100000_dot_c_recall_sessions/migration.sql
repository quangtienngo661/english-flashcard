-- Round C (design §4, DC11): a recall ("Ôn") session is a practice session of kind 'recall'. It is exempt from the daily practice
-- quota and never shown on the practice page; a learner may have one open session of each kind.
ALTER TABLE practice_sessions ADD COLUMN kind text NOT NULL DEFAULT 'practice' CHECK (kind IN ('practice', 'recall'));

-- What the final answer did to the schedule (summary: "Đúng, lên nấc n" vs "Đúng, giữ nấc"); null outside recall sessions.
ALTER TABLE practice_session_items ADD COLUMN recall_outcome text CHECK (recall_outcome IN ('leveled_up', 'kept'));

DROP INDEX practice_sessions_open_key;
CREATE UNIQUE INDEX practice_sessions_open_key ON practice_sessions (user_id, kind) WHERE status IN ('active', 'waiting_continue');
