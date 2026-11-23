-- AlterTable
ALTER TABLE "email_verifications" ADD COLUMN     "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_available_at" TIMESTAMP(3),
ADD COLUMN     "delivery_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_delivery_id_key" ON "email_verifications"("delivery_id");

-- CreateIndex
CREATE INDEX "email_verifications_delivery_available_at_id_idx" ON "email_verifications"("delivery_available_at", "id");
