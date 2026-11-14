-- AlterTable
ALTER TABLE "fake_billing_subscriptions" ADD COLUMN     "history" JSONB NOT NULL DEFAULT '[]';
