-- CreateTable
CREATE TABLE "watchlist_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "work_modes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contract_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industry_no_gos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hiring_regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_preferences_user_id_key" ON "watchlist_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "watchlist_preferences" ADD CONSTRAINT "watchlist_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
