-- Practice AI count (09/11/2026, design §4 step 7): how a session started with `ai_count` places its AI questions; null for a session
-- started the old way (no `ai_count`), which keeps the r ÷ q chance in later rounds.
ALTER TABLE practice_sessions ADD COLUMN ai_placement text;
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_ai_placement_check
  CHECK (ai_placement IS NULL OR ai_placement IN ('even', 'random'));
