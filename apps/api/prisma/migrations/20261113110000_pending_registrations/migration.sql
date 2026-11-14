-- Security review 07/11 F3: a re-registration of an unverified email waits here until the mailbox code confirms it.
-- CreateTable
CREATE TABLE "pending_registrations" (
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "given_name" VARCHAR(50) NOT NULL,
    "family_name" VARCHAR(50),
    "birth_date" DATE NOT NULL,
    "timezone" TEXT NOT NULL,
    "terms_version" TEXT NOT NULL,
    "terms_accepted_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "pending_registrations" ADD CONSTRAINT "pending_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
