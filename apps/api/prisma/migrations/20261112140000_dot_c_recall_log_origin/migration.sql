-- Round C: a final answer in a recall session writes a learning_log row with origin 'recall' (found by the round C smoke: the old check
-- allowed only 'practice', so the answer failed with a database error).
ALTER TABLE learning_log DROP CONSTRAINT learning_log_origin_check;
ALTER TABLE learning_log ADD CONSTRAINT learning_log_origin_check CHECK (origin IN ('practice', 'recall'));
