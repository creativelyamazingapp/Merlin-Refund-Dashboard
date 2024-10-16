-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_orderId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refunds" JSONB;
