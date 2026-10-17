-- CreateTable
CREATE TABLE "reminder_prefs" (
    "user_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reminder_prefs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "reminder_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "reminder_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_deliveries_user_id_local_date_key" ON "reminder_deliveries"("user_id", "local_date");

-- Value checks (not expressible in the Prisma schema)
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_kind_check" CHECK ("kind" IN ('regular', 'inactive'));
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_state_check" CHECK ("state" IN ('sending', 'sent', 'failed'));
