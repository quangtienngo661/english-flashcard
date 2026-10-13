-- AlterTable
ALTER TABLE "import_row_outcomes" ADD COLUMN "error_messages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
