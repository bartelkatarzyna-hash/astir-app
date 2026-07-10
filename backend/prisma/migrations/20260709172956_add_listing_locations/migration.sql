-- AlterTable
ALTER TABLE "job_listings" ADD COLUMN     "locations" TEXT[] DEFAULT ARRAY[]::TEXT[];
