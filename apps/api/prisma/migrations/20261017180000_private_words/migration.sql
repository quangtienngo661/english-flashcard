-- Private words (Bước 3, Task 5). Hand-written CHECK changes only; no Prisma schema change.
ALTER TABLE "entries" DROP CONSTRAINT "entries_pos_check";
-- 'unspecified' is stored when a learner gives no part of speech; it is never valid for catalog rows.
ALTER TABLE "entries" ADD CONSTRAINT "entries_pos_check" CHECK ("pos" IN (
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner',
    'conjunction', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb',
    'infinitive-to', 'interjection'
) OR ("scope" = 'private' AND "pos" = 'unspecified'));
ALTER TABLE "entry_levels" DROP CONSTRAINT "entry_levels_basis_check";
ALTER TABLE "entry_levels" ADD CONSTRAINT "entry_levels_basis_check" CHECK ("basis" IN ('imported', 'editorial', 'user', 'derived'));
ALTER TABLE "sense_revisions" DROP CONSTRAINT "sense_revisions_draft_source_check";
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_draft_source_check" CHECK ("draft_source" IN ('csv', 'ui', 'user'));
