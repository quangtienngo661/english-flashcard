-- An answer given from the backlog is logged as 'backlog' so it never counts against the daily caps (design 6.1, review L2).
ALTER TABLE "learning_log" DROP CONSTRAINT "learning_log_section_check";
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_section_check" CHECK ("section" IN ('priority', 'due', 'new', 'backlog', 'early'));
