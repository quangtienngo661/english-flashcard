-- AlterTable
ALTER TABLE "learning_log" ADD COLUMN     "origin" TEXT;

-- Hand-written: a review pressed in a practice session (Bước 4 design 5.3); null for flashcards.
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_origin_check" CHECK ("origin" IN ('practice'));
