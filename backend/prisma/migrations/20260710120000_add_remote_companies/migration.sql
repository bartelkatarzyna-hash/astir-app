-- CreateTable
CREATE TABLE "remote_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "careers_url" TEXT,
    "job_source_id" TEXT,
    "resolution_status" TEXT NOT NULL DEFAULT 'pending',
    "added_by_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "remote_companies_name_key_key" ON "remote_companies"("name_key");

-- AddForeignKey
ALTER TABLE "remote_companies" ADD CONSTRAINT "remote_companies_job_source_id_fkey" FOREIGN KEY ("job_source_id") REFERENCES "job_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
