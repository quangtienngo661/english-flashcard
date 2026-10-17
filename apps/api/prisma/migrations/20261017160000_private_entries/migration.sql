-- DropIndex
DROP INDEX "entries_language_lemma_pos_key";

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "owner_user_id" UUID,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'catalog';

-- Hand-written: Prisma cannot express these CHECKs or partial unique indexes.
ALTER TABLE "entries" ADD CONSTRAINT "entries_scope_check" CHECK ("scope" IN ('catalog', 'private'));
ALTER TABLE "entries" ADD CONSTRAINT "entries_scope_owner_check" CHECK (("scope" = 'catalog') = ("owner_user_id" IS NULL));
-- Every ON CONFLICT on entries must repeat the predicate, e.g. ON CONFLICT (language, lemma, pos) WHERE scope = 'catalog'.
CREATE UNIQUE INDEX entries_catalog_key ON entries (language, lemma, pos) WHERE scope = 'catalog';
CREATE UNIQUE INDEX entries_private_key ON entries (owner_user_id, language, lemma, pos) WHERE scope = 'private';
