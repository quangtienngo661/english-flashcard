-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "family_name" VARCHAR(50),
ADD COLUMN     "given_name" VARCHAR(50),
ADD COLUMN     "lock_reason" VARCHAR(500),
ADD COLUMN     "locked_at" TIMESTAMPTZ,
ADD COLUMN     "locked_by" UUID,
ADD COLUMN     "terms_accepted_at" TIMESTAMPTZ,
ADD COLUMN     "terms_version" TEXT;

-- CreateIndex
CREATE INDEX "users_created_at_id_idx" ON "users"("created_at" DESC, "id" DESC);

-- Status is a closed set; later tasks add the locked state.
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'locked'));
