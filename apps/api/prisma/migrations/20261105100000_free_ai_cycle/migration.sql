-- Launch prep A, round A (M3): when a subscription stopped being Pro or trial, and the plan a unit of AI use was reserved under.
ALTER TABLE "subscriptions" ADD COLUMN "ended_at" TIMESTAMPTZ;
ALTER TABLE "usage_records" ADD COLUMN "plan" TEXT;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_plan_check" CHECK ("plan" IS NULL OR "plan" IN ('free', 'trial', 'pro'));
