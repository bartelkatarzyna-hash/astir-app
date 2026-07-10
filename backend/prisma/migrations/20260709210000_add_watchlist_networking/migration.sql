-- AlterTable
ALTER TABLE "watchlist_companies" ADD COLUMN     "networking_stage" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "networking_notes" TEXT;
