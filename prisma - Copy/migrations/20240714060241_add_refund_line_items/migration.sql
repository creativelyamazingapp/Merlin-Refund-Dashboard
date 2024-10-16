-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "altImageText" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "image" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "refundLineItems" JSONB NOT NULL DEFAULT '[]';
