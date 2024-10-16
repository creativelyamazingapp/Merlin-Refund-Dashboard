import { format } from "date-fns";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "~/shopify.server";

type ChartData = {
  labels: string[];
  salesData: number[];
  refundData: number[];
};

type RefundReason = {
  reason: string;
  count: number;
  refundAmount: number;
};

// Initialize Prisma client globally to prevent creating multiple instances
const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");
  const productTitle = url.searchParams.get("productTitle"); // Get productTitle for detailed fetch
 
  // Convert to Date objects
  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const endDate = endDateParam ? new Date(endDateParam) : undefined;

  try {
    if (productTitle) {
      // Fetch reasons for refunds, filtering only valid refunds within the selected date range
      const refundReasons = await prisma.refund.groupBy({
        by: ["note"],
        _count: {
          note: true,
        },
        _sum: {
          amount: true,
        },
        where: {
          refundLineItems: {
            some: {
              title: {
                equals: productTitle.trim(),
                mode: "insensitive",
              },
            },
          },
          order: {
            shop: session.shop,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          // Ensure we're excluding null and empty string notes
          AND: [
            { note: { not: null } }, // Exclude null values
            { note: { not: '' } },   // Exclude empty string values
          ]
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: 3, // Fetch the top 3 reasons
      });

      const topReasons = refundReasons.map((reason) => ({
        reason: reason.note?.trim() || "No Reason Provided",
        count: reason._count.note || 0,
        refundAmount: reason._sum.amount || 0,
      }));

      // Fetch total sales and refunds for the selected product by date range
      const salesAggregate = await prisma.orderLineItem.aggregate({
        _sum: { price: true },
        where: {
          title: {
            equals: productTitle.trim(),
            mode: "insensitive",
          },
          order: {
            shop: session.shop,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      });

      const refundsAggregate = await prisma.refund.aggregate({
        _sum: { amount: true },
        where: {
          refundLineItems: {
            some: {
              title: {
                equals: productTitle.trim(),
                mode: "insensitive",
              },
            },
          },
          order: {
            shop: session.shop,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      });

      // Group sales by date
      const salesByDate = await prisma.order.groupBy({
        by: ["createdAt"],
        _sum: { totalPrice: true },
        where: {
          shop: session.shop,
          lineItems: {
            some: {
              title: {
                equals: productTitle.trim(),
                mode: "insensitive",
              },
            },
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Group refunds by date
      const refundsByDate = await prisma.refund.groupBy({
        by: ["createdAt"],
        _sum: { amount: true },
        where: {
          refundLineItems: {
            some: {
              title: {
                equals: productTitle.trim(),
                mode: "insensitive",
              },
            },
          },
          order: {
            shop: session.shop,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Merge sales and refunds data by date
      const mergedData = {};
      salesByDate.forEach((sale) => {
        const dateKey = format(new Date(sale.createdAt), "yyyy-MM-dd");
        if (!mergedData[dateKey]) {
          mergedData[dateKey] = { sales: 0, refunds: 0 };
        }
        mergedData[dateKey].sales += sale._sum.totalPrice || 0;
      });

      refundsByDate.forEach((refund) => {
        const dateKey = format(new Date(refund.createdAt), "yyyy-MM-dd");
        if (!mergedData[dateKey]) {
          mergedData[dateKey] = { sales: 0, refunds: 0 };
        }
        mergedData[dateKey].refunds += refund._sum.amount || 0;
      });

      // Build chart data
      const chartLabels = Object.keys(mergedData).sort();
      const chartData: ChartData = {
        labels: chartLabels,
        salesData: chartLabels.map((date) => mergedData[date].sales),
        refundData: chartLabels.map((date) => mergedData[date].refunds),
      };

      const totalSalesAmount = salesAggregate._sum.price || 0;
      const totalRefundAmount = refundsAggregate._sum.amount || 0;


      return json({
        totalSalesAmount,
        totalRefundAmount,
        totalProfit: totalSalesAmount - totalRefundAmount,
        chartData,
        topReasons, // Return top 3 refund reasons
      });
    }
    return json({ chartData: { labels: [], salesData: [], refundData: [] }, topReasons: [] });
  } catch (err) {
    console.error("Error fetching data:", err);
    return json({ error: "Error fetching data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
