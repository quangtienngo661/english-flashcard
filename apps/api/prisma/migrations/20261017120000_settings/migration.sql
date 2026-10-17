-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "app_setting_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "old_value" JSONB NOT NULL,
    "new_value" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_setting_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_setting_changes_changed_at_id_idx" ON "app_setting_changes"("changed_at" DESC, "id" DESC);
