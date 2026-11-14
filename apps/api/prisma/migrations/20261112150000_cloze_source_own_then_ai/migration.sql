-- Cloze source 'own_then_ai' (owner, 09/11/2026): a word with a saved sentence is asked from it, a word without one gets an AI cloze.
-- The session stores one value for both, so the check on practice_sessions.cloze_source must accept it.
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_sessions_cloze_source_check";
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_cloze_source_check" CHECK ("cloze_source" IN ('ai', 'own', 'own_then_ai'));
