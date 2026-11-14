-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" VARCHAR(2048),
ADD COLUMN     "deleting_by" VARCHAR(16),
ADD COLUMN     "deleting_since" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "session_chains" ADD COLUMN     "auth_method" VARCHAR(16) NOT NULL DEFAULT 'password';

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deleted_accounts" (
    "user_id" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ NOT NULL,
    "by" VARCHAR(16) NOT NULL,

    CONSTRAINT "deleted_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_subject_key" ON "user_identities"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_user_id_provider_key" ON "user_identities"("user_id", "provider");

-- CreateIndex
CREATE INDEX "deleted_accounts_deleted_at_idx" ON "deleted_accounts"("deleted_at");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Closed sets (invisible to the Prisma drift check, like users_status_check before).
ALTER TABLE users DROP CONSTRAINT users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'locked', 'deleting'));
ALTER TABLE users ADD CONSTRAINT users_deleting_by_check CHECK (deleting_by IS NULL OR deleting_by IN ('self', 'admin', 'cleanup'));
ALTER TABLE session_chains ADD CONSTRAINT session_chains_auth_method_check CHECK (auth_method IN ('password', 'google'));
ALTER TABLE user_identities ADD CONSTRAINT user_identities_provider_check CHECK (provider IN ('google'));
ALTER TABLE deleted_accounts ADD CONSTRAINT deleted_accounts_by_check CHECK (by IN ('self', 'admin', 'cleanup'));
