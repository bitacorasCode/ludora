-- CreateTable
CREATE TABLE "password_recovery_jobs" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "prepared" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_recovery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_recovery_jobs_available_at_id_idx" ON "password_recovery_jobs"("available_at", "id");

