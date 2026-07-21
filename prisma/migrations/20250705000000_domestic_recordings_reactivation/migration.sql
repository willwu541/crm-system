-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'DORMANT', 'AWAKENING', 'LOST');

-- CreateEnum
CREATE TYPE "RecordingAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "wechat" TEXT,
    "region" TEXT,
    "source" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_contact_at" TIMESTAMP(3),
    "next_follow_up_at" TIMESTAMP(3),
    "last_wake_up_at" TIMESTAMP(3),
    "wake_up_count" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_recordings" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "title" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration" INTEGER,
    "transcript" TEXT,
    "summary" TEXT,
    "customer_intent" TEXT,
    "key_points" TEXT[],
    "suggested_follow_up" TEXT,
    "sentiment" TEXT,
    "analysis_status" "RecordingAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analysis_error" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_recordings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "customer_id" TEXT;

-- CreateIndex
CREATE INDEX "customers_owner_id_idx" ON "customers"("owner_id");
CREATE INDEX "customers_status_idx" ON "customers"("status");
CREATE INDEX "customers_last_contact_at_idx" ON "customers"("last_contact_at");
CREATE INDEX "customers_next_follow_up_at_idx" ON "customers"("next_follow_up_at");

CREATE INDEX "call_recordings_customer_id_idx" ON "call_recordings"("customer_id");
CREATE INDEX "call_recordings_order_id_idx" ON "call_recordings"("order_id");
CREATE INDEX "call_recordings_analysis_status_idx" ON "call_recordings"("analysis_status");
CREATE INDEX "call_recordings_created_at_idx" ON "call_recordings"("created_at");

CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
