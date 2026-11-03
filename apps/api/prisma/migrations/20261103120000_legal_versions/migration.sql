-- Legal documents (03/11/2026): versions of the Privacy Policy and the Terms of Use, edited in the admin app.

-- CreateTable
CREATE TABLE "legal_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "privacy_vi" TEXT NOT NULL DEFAULT '',
    "terms_vi" TEXT NOT NULL DEFAULT '',
    "privacy_en" TEXT,
    "terms_en" TEXT,
    "effective_date" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "published_by" UUID,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "legal_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "legal_versions_status_check" CHECK ("status" IN ('draft', 'published', 'superseded'))
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_versions_number_key" ON "legal_versions"("number");

-- At most one published version at a time; publishing supersedes the old one in the same transaction.
CREATE UNIQUE INDEX legal_versions_one_published_key ON legal_versions ((true)) WHERE status = 'published';
