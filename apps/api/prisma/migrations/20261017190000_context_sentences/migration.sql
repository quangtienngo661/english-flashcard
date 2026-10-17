-- CreateTable
CREATE TABLE "context_sentences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_sentences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "context_sentences_user_id_sense_id_idx" ON "context_sentences"("user_id", "sense_id");

-- AddForeignKey
ALTER TABLE "context_sentences" ADD CONSTRAINT "context_sentences_sense_id_fkey" FOREIGN KEY ("sense_id") REFERENCES "senses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

