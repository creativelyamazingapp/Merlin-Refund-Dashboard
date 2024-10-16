/*
  Warnings:

  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `appId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingAddress` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `browserIp` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `cancelReason` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `checkoutId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `checkoutToken` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `clientDetails` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `closedAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `confirmed` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `contactEmail` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerLocale` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `discountCodes` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `financialStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `fulfillmentStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `fulfillments` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `gateway` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `lineItems` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `noteAttributes` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderNumber` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderStatusUrl` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentGatewayNames` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `processingMethod` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `refundItems` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `refunds` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddress` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shippingLines` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sourceIdentifier` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sourceName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `subtotalPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `subtotalPriceSet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `taxLines` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `taxesIncluded` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalDiscounts` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalDiscountsSet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalLineItemsPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalLineItemsPriceSet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalPriceSet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalPriceUsd` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalShippingPriceSet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalTax` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalTaxSet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalWeight` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Order` table. All the data in the column will be lost.
  - The primary key for the `Refund` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `currency` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currencyCode` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `totalPrice` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `createdAt` to the `Refund` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyCode` to the `Refund` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `amount` on the `Refund` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropIndex
DROP INDEX "Order_shopifyId_key";

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
DROP COLUMN "appId",
DROP COLUMN "billingAddress",
DROP COLUMN "browserIp",
DROP COLUMN "cancelReason",
DROP COLUMN "cancelledAt",
DROP COLUMN "checkoutId",
DROP COLUMN "checkoutToken",
DROP COLUMN "clientDetails",
DROP COLUMN "closedAt",
DROP COLUMN "confirmed",
DROP COLUMN "contactEmail",
DROP COLUMN "currency",
DROP COLUMN "customerLocale",
DROP COLUMN "deviceId",
DROP COLUMN "discountCodes",
DROP COLUMN "financialStatus",
DROP COLUMN "fulfillmentStatus",
DROP COLUMN "fulfillments",
DROP COLUMN "gateway",
DROP COLUMN "lineItems",
DROP COLUMN "locationId",
DROP COLUMN "note",
DROP COLUMN "noteAttributes",
DROP COLUMN "number",
DROP COLUMN "orderNumber",
DROP COLUMN "orderStatusUrl",
DROP COLUMN "paymentGatewayNames",
DROP COLUMN "phone",
DROP COLUMN "processedAt",
DROP COLUMN "processingMethod",
DROP COLUMN "reference",
DROP COLUMN "refundItems",
DROP COLUMN "refunds",
DROP COLUMN "shippingAddress",
DROP COLUMN "shippingLines",
DROP COLUMN "shopifyId",
DROP COLUMN "sourceIdentifier",
DROP COLUMN "sourceName",
DROP COLUMN "sourceUrl",
DROP COLUMN "subtotalPrice",
DROP COLUMN "subtotalPriceSet",
DROP COLUMN "tags",
DROP COLUMN "taxLines",
DROP COLUMN "taxesIncluded",
DROP COLUMN "token",
DROP COLUMN "totalDiscounts",
DROP COLUMN "totalDiscountsSet",
DROP COLUMN "totalLineItemsPrice",
DROP COLUMN "totalLineItemsPriceSet",
DROP COLUMN "totalPriceSet",
DROP COLUMN "totalPriceUsd",
DROP COLUMN "totalShippingPriceSet",
DROP COLUMN "totalTax",
DROP COLUMN "totalTaxSet",
DROP COLUMN "totalWeight",
DROP COLUMN "userId",
ADD COLUMN     "address1" TEXT,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currencyCode" TEXT NOT NULL,
ADD COLUMN     "customerFirstName" TEXT,
ADD COLUMN     "customerLastName" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "shippingFirstName" TEXT,
ADD COLUMN     "shippingLastName" TEXT,
ADD COLUMN     "zip" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "totalPrice",
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "customerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Order_id_seq";

-- AlterTable
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_pkey",
DROP COLUMN "currency",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "currencyCode" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "orderId" SET DATA TYPE TEXT,
DROP COLUMN "amount",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD CONSTRAINT "Refund_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Refund_id_seq";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "Product";

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundLineItem" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RefundLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderLineItem_orderId_idx" ON "OrderLineItem"("orderId");

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundLineItem" ADD CONSTRAINT "RefundLineItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
