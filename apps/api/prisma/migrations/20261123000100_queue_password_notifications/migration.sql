-- CreateTable
CREATE TABLE "password_notification_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_first_password" BOOLEAN NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_notification_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_notification_jobs_available_at_id_idx" ON "password_notification_jobs"("available_at", "id");

-- CreateIndex
CREATE INDEX "password_notification_jobs_user_id_idx" ON "password_notification_jobs"("user_id");

-- AddForeignKey
ALTER TABLE "password_notification_jobs" ADD CONSTRAINT "password_notification_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

