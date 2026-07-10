-- CreateTable
CREATE TABLE "job_sources" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "location" TEXT,
    "work_mode" TEXT,
    "url" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listing_sources" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "job_source_id" TEXT,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_listing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_job_listings" (
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "matched_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_job_listings_pkey" PRIMARY KEY ("user_id","listing_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_sources_provider_external_id_key" ON "job_sources"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_fingerprint_key" ON "job_listings"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "job_listing_sources_provider_external_id_key" ON "job_listing_sources"("provider", "external_id");

-- AddForeignKey
ALTER TABLE "job_listing_sources" ADD CONSTRAINT "job_listing_sources_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listing_sources" ADD CONSTRAINT "job_listing_sources_job_source_id_fkey" FOREIGN KEY ("job_source_id") REFERENCES "job_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_job_listings" ADD CONSTRAINT "user_job_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_job_listings" ADD CONSTRAINT "user_job_listings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
