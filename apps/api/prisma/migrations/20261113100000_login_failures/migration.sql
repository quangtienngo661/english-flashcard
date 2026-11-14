-- Security review 07/11 F4: the ten-wrong-password lock moves from the user row to one row per (account, client ip key).
-- CreateTable
CREATE TABLE "login_failures" (
    "user_id" UUID NOT NULL,
    "ip_key" TEXT NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "login_failures_pkey" PRIMARY KEY ("user_id", "ip_key")
);

-- AddForeignKey
ALTER TABLE "login_failures" ADD CONSTRAINT "login_failures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "failed_login_count", DROP COLUMN "login_locked_until";
