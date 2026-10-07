-- DropTable
DROP TABLE "rate_limit_counters";

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_counters_key_window_start_key" ON "rate_limit_counters"("key", "window_start");
