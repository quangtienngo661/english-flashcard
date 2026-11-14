-- CreateTable
CREATE TABLE "learning_activity_days" (
    "user_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,

    CONSTRAINT "learning_activity_days_pkey" PRIMARY KEY ("user_id","local_date")
);
