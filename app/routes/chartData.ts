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

// Initialize Prisma client globally to prevent creating multiple instances
const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");
  const productTitle = url.searchParams.get("productTitle"); // Get productTitle for detailed fetch
  console.log("productTitle:", productTitle);
  // Convert to Date objects
  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const endDate = endDateParam ? new Date(endDateParam) : undefined;
  console.log("Parsed Date range:", startDate, endDate);

  try {
    if (productTitle) {
      // Fetch detailed refund data for the product
      const refundDetails = await prisma.refundLineItem.findMany({
        where: {
          title: {
            equals: productTitle.trim(),
            mode: "insensitive", // Case-insensitive match
          },
          refund: {
            // Directly apply the date filter on the refund model
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            order: {
              shop: session.shop,
            },
          },
        },
        include: {
          refund: {
            include: {
              order: true,
            },
          },
        },
      });

      // Log the results to verify if the filtering worked
      console.log("Fetched refundDetails count:", refundDetails.length);
      console.log(
        "Fetched refundDetails:",
        refundDetails.map((detail) => ({
          refundDate: detail.refund.createdAt, // Log refund date for each detail
        })),
      );

      // Format refund details to be sent in response
      const formattedRefundDetails = refundDetails.map((detail) => ({
        orderNumber: detail.refund.order.name,
        customerName: `${detail.refund.order.customerFirstName} ${detail.refund.order.customerLastName}`,
        refundAmount: detail.refund.amount,
        refundNotes: detail.refund.note,
        email: detail.refund.order.email,
        orderDate: detail.refund.order.createdAt,
        refundDate: detail.refund.createdAt, // Add refund date
      }));

      console.log("object", formattedRefundDetails);
      return json({ refundDetails: formattedRefundDetails });
    }

    // Fetch all orders within the date range and group by date
    const orders = await prisma.order.findMany({
      where: {
        shop: session.shop,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lineItems: true, // Fetch products in each order
        refunds: true, // Fetch refunds for each order
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch total sales and refunds using Prisma's aggregation function
    const salesAggregate = await prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: {
        shop: session.shop,
      },
    });

    const refundsAggregate = await prisma.refund.aggregate({
      _sum: { amount: true },
      where: {
        order: {
          shop: session.shop,
        },
      },
    });

    // Aggregate total sales by date
const salesByDate = await prisma.order.groupBy({
  by: ["createdAt"],
  _sum: { totalPrice: true },
  where: {
    shop: session.shop,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  },
  orderBy: {
    createdAt: "asc",
  },
});

// Aggregate total refunds by date
const refundsByDate = await prisma.refund.groupBy({
  by: ["createdAt"],
  _sum: { amount: true },
  where: {
    order: {
      shop: session.shop,
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
const chartLabels = Object.keys(mergedData).sort(); // Sort dates
const chartData: ChartData = {
  labels: chartLabels,
  salesData: chartLabels.map((date) => mergedData[date].sales),
  refundData: chartLabels.map((date) => mergedData[date].refunds),
};


    // Access the _sum properties directly after the query
    const totalSalesAmount = salesAggregate._sum.totalPrice || 0;
    const totalRefundAmount = refundsAggregate._sum.amount || 0;

    // Calculate total profit
    const totalProfit = totalSalesAmount - totalRefundAmount;

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
        order: {
          shop: session.shop,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        AND: {
          orderId: {
            in: orders.map((order) => order.id),
          },
        },
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 3,
    });

    const topReasons = refundReasons.map((reason) => ({
      reason: reason.note?.trim() || "No Reason Provided",
      count: reason._count.note || 0,
      refundAmount: reason._sum.amount || 0,
    }));

    const totalRefundAmountFromTopReasons = topReasons.reduce((sum, reason) => sum + reason.refundAmount, 0);


    const refundedProducts = await prisma.refundLineItem.groupBy({
      by: ["title"],
      _count: {
        title: true, // Count the number of times each product is refunded
      },
      _sum: {
        quantity: true, // Sum the quantities of refunded products
      },
      where: {
        refund: {
          order: {
            shop: session.shop,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      orderBy: {
        _count: {
          title: "desc",
        },
      },
      take: 3, // Get the top 5 most refunded products
    });

    
     
      // Fetch the total refund amount and product imageUrl for each title
      const topRefundedProducts = await Promise.all(
        refundedProducts.map(async (item) => {
          // Sum up the refund amount for each product title
          const totalRefundAmount = await prisma.refund.aggregate({
            _sum: {
              amount: true,
            },
            where: {
              refundLineItems: {
                some: {
                  title: item.title,
                },
              },
              order: {
                shop: session.shop,
              },
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          });

          // Fetch one OrderLineItem to get the imageUrl
          const lineItem = await prisma.orderLineItem.findFirst({
            where: { title: item.title },
          });

          return {
            title: item.title,
            refundCount: item._count.title,
            totalRefundedQuantity: item._sum.quantity || 0,
            totalRefundAmount: totalRefundAmount._sum.amount || 0,
            productUrl: lineItem?.imageUrl || null, // Use imageUrl directly as the product URL
          };
        }),
      );

      console.log("Top refunded products:", topRefundedProducts);
    


    console.log("Top refunded products:", topRefundedProducts);

    const overallData = {
      totalSalesAmount,
      totalRefundAmount,
      totalProfit,
    };

    console.log("Refunded products:", refundedProducts);

    console.log("Top refunded products:", topRefundedProducts);

    return json({
      totalSalesAmount,
      totalRefundAmount,
      totalProfit,
      chartData,
      topReasons,
      topRefundedProducts,
      salesByDate,
      refundsByDate,
      totalRefundAmountFromTopReasons
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    return json({ error: "Error fetching orders" }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Ensure Prisma disconnects from the database
  }
};
