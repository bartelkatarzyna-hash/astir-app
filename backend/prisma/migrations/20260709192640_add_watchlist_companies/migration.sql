-- AlterTable
ALTER TABLE "job_sources" ADD COLUMN     "company_key" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'ats';

-- CreateTable
CREATE TABLE "watchlist_companies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "careers_url" TEXT,
    "alerts_on" BOOLEAN NOT NULL DEFAULT true,
    "job_source_id" TEXT,
    "resolution_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_companies_user_id_name_key_key" ON "watchlist_companies"("user_id", "name_key");

-- CreateIndex
CREATE INDEX "job_sources_company_key_idx" ON "job_sources"("company_key");

-- AddForeignKey
ALTER TABLE "watchlist_companies" ADD CONSTRAINT "watchlist_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_companies" ADD CONSTRAINT "watchlist_companies_job_source_id_fkey" FOREIGN KEY ("job_source_id") REFERENCES "job_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
