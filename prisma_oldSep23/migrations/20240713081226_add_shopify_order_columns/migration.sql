-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "email" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "number" INTEGER NOT NULL,
    "note" TEXT,
    "token" TEXT NOT NULL,
    "gateway" TEXT,
    "totalPrice" TEXT NOT NULL,
    "subtotalPrice" TEXT NOT NULL,
    "totalWeight" INTEGER NOT NULL,
    "totalTax" TEXT NOT NULL,
    "taxesIncluded" BOOLEAN NOT NULL,
    "currency" TEXT NOT NULL,
    "financialStatus" TEXT,
    "confirmed" BOOLEAN NOT NULL,
    "totalDiscounts" TEXT NOT NULL,
    "totalLineItemsPrice" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "totalPriceUsd" TEXT,
    "checkoutToken" TEXT,
    "reference" TEXT,
    "userId" TEXT,
    "locationId" TEXT,
    "sourceIdentifier" TEXT,
    "sourceUrl" TEXT,
    "processedAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "phone" TEXT,
    "customerLocale" TEXT,
    "appId" TEXT,
    "browserIp" TEXT,
    "orderNumber" INTEGER NOT NULL,
    "discountCodes" JSONB NOT NULL,
    "noteAttributes" JSONB NOT NULL,
    "paymentGatewayNames" JSONB NOT NULL,
    "processingMethod" TEXT,
    "checkoutId" TEXT,
    "sourceName" TEXT NOT NULL,
    "fulfillmentStatus" TEXT,
    "taxLines" JSONB NOT NULL,
    "tags" TEXT NOT NULL,
    "contactEmail" TEXT,
    "orderStatusUrl" TEXT NOT NULL,
    "totalLineItemsPriceSet" JSONB NOT NULL,
    "totalDiscountsSet" JSONB NOT NULL,
    "totalShippingPriceSet" JSONB NOT NULL,
    "subtotalPriceSet" JSONB NOT NULL,
    "totalPriceSet" JSONB NOT NULL,
    "totalTaxSet" JSONB NOT NULL,
    "lineItems" JSONB NOT NULL,
    "shippingLines" JSONB NOT NULL,
    "billingAddress" JSONB NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "fulfillments" JSONB NOT NULL,
    "clientDetails" JSONB NOT NULL,
    "refunds" JSONB NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopifyId_key" ON "Order"("shopifyId");
