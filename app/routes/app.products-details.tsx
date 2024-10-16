import { LoaderFunction, ActionFunction } from "@remix-run/node";
import { useLoaderData, useFetcher, useSubmit } from "@remix-run/react";
import {
  Select,
  Card,
  Text,
  Layout,
  TextField,
  Button,
  Page,
  DataTable,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { PrismaClient } from "@prisma/client";
import RefundGauge from "../component/refund-gauge";
import { format, subDays } from "date-fns";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { authenticate } from "~/shopify.server";

// Register chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Initialize Prisma client
const prisma = new PrismaClient();

// Define the expected structure for fetcher data
interface FetcherData {
  totalSales: number;
  totalOrderPrice: number;
  totalRefundAmount: number;
  orderNumbers: string[];
  chartData: {
    labels: string[];
    salesData: number[];
    refundData: number[];
  };
  ordersTableData: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    orderDate: string;
    orderedProducts: string;
    isRefunded: string;
    orderAmount: string;
    refundNote: string;
  }[];
  topReasons: {
    reason: string;
    count: number;
    refundAmount: number;
  }[];
}

// Loader function to fetch product titles
export const loader: LoaderFunction = async ({request}) => {
  const { session } = await authenticate.admin(request);

  try {
    const products = await prisma.product.findMany({
      where: {
        lineItems: {
          some: {
            order: {
              shop: session.shop, // Filter by the shop associated with the order
            },
          },
        },
      },
      select: {
        title: true, // Select only the product titles
      },
    });
    
    const uniqueProductTitles = Array.from(
      new Set(products.map((product) => product.title)),
    );
    return { uniqueProductTitles };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { uniqueProductTitles: [] };
  }
};

// Action function to fetch total sales, price, refunds, and order numbers for a selected product
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const selectedProductTitle = formData.get("productTitle") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  try {
    // Fetch total sales (quantity sold)
    const totalSales = await prisma.orderLineItem.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        title: selectedProductTitle,
        order: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
    });

    // Fetch total order price
    const totalPrice = await prisma.orderLineItem.findMany({
      where: {
        title: selectedProductTitle,
        order: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
      select: {
        order: {
          select: {
            totalPrice: true,
            name: true, // Fetch order number
            customerFirstName: true,
            customerLastName: true,
            email: true,
            createdAt: true,
          },
        },
        title: true,
      },
    });

    const totalOrderPrice = totalPrice.reduce(
      (acc, item) => acc + (item.order?.totalPrice || 0),
      0,
    );

    // Fetch all refunds for the selected product by matching refund line items
    // Fetch all refunds for the selected product by matching refund line items
    // Fetch all refunds for the selected product by matching refund line items
    const refunds = await prisma.refund.findMany({
      where: {
        refundLineItems: {
          some: {
            lineItemId: {
              in: (
                await prisma.orderLineItem.findMany({
                  where: {
                    title: selectedProductTitle,
                    order: {
                      createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                      },
                    },
                  },
                  select: {
                    id: true, // Get the IDs of the matching line items
                  },
                })
              ).map((lineItem) => lineItem.id),
            },
          },
        },
      },
      select: {
        amount: true, // Fetch the refund amount
        note: true, // Fetch the refund note
        order: {
          select: {
            name: true, // Fetch the order name to match with the item.order?.name
          },
        },
      },
    });

    // Calculate the total refund amount
    const totalRefundAmount = refunds.reduce(
      (acc, refund) => acc + refund.amount,
      0,
    );

    // Prepare the orders table data
    // Prepare the orders table data
    const ordersTableData = totalPrice.map((item) => {
      // Find refunds associated with the current order number
      const matchingRefunds = refunds.filter(
        (refund) => refund.order.name === item.order?.name,
      );

      return {
        orderNumber: item.order?.name || "",
        customerName: `${item.order?.customerFirstName || ""} ${item.order?.customerLastName || ""}`,
        customerEmail: item.order?.email || "",
        orderDate: format(new Date(item.order?.createdAt || ""), "yyyy-MM-dd"),
        orderedProducts: item.title || "",
        isRefunded: matchingRefunds.length > 0 ? "Yes" : "No", // Check if there are any refunds
        orderAmount: (item.order?.totalPrice || 0).toFixed(2),
        refundNote:
          matchingRefunds.map((refund) => refund.note).join(", ") || "N/A", // Concatenate refund notes, if available
      };
    });

    // Fetch the order numbers (names) associated with the product
    const orderNumbers = totalPrice.map((item) => item.order?.name || "");

    return {
      totalSales: totalSales._sum.quantity || 0,
      totalOrderPrice: totalOrderPrice || 0,
      totalRefundAmount: totalRefundAmount || 0,
      orderNumbers: orderNumbers || [],
      ordersTableData,
    };
  } catch (error) {
    console.error(
      "Error fetching total sales, price, refunds, and orders:",
      error,
    );
    return {
      totalSales: 0,
      totalOrderPrice: 0,
      totalRefundAmount: 0,
      orderNumbers: [],
      ordersTableData: [],
    };
  }
};

// Register chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface FetcherData {
  totalSales: number;
  totalOrderPrice: number;
  totalRefundAmount: number;
  orderNumbers: string[];
  chartData: {
    labels: string[];
    salesData: number[];
    refundData: number[];
  };
  ordersTableData: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    orderDate: string;
    orderedProducts: string;
    isRefunded: string;
    orderAmount: string;
    refundNote: string;
  }[];
  topReasons: {
    reason: string;
    count: number;
    refundAmount: number;
  }[];
}

export default function ProductsDropdownPage() {
  const { uniqueProductTitles } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<FetcherData>();
  const chartFetcher = useFetcher<FetcherData>(); // Separate fetcher for chart data
  const submit = useSubmit();
  const [loading, setLoading] = useState(false);

  const [topReasons, setTopReasons] = useState<
    { reason: string; count: number; refundAmount: number }[]
  >([]);
  const [chartRefundAmount, setChartRefundAmount] = useState(0);
  const [chartProfit, setChartProfit] = useState(0);
  const [chartMainData, setChartMainData] = useState<{
    labels: string[];
    salesData: number[];
    refundData: number[];
  }>({ labels: [], salesData: [], refundData: [] });
  const [selectedProduct, setSelectedProduct] = useState("");
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd"), // Default to last 30 days
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  const profit =
    (fetcher.data?.totalOrderPrice ?? 0) -
    (fetcher.data?.totalRefundAmount ?? 0);
  const sales = fetcher.data?.totalOrderPrice ?? 0;
  const refunds = fetcher.data?.totalRefundAmount ?? 0;

  // Fetch both sales and chart data
  const fetchChartAndSalesData = () => {
    setLoading(true);

    const formData = new FormData();
    formData.set("productTitle", selectedProduct);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);

    fetcher.submit(formData, { method: "post" });

    const fullUrl = `/chartDataProducts?startDate=${startDate}&endDate=${endDate}&productTitle=${encodeURIComponent(selectedProduct)}`;
    chartFetcher.load(fullUrl); // Ensure the productTitle is included here
  };

  useEffect(() => {
    if (fetcher.data) {
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (chartFetcher.data) {
      setChartMainData(chartFetcher.data.chartData);
      setChartRefundAmount(chartFetcher.data.totalRefundAmount);
      setChartProfit(
        chartFetcher.data.totalOrderPrice - chartFetcher.data.totalRefundAmount,
      );
      setTopReasons(chartFetcher.data.topReasons || []); // Update the top refund reasons
    }
  }, [chartFetcher.data]);

  const handleSelectChange = useCallback((value: string) => {
    setSelectedProduct(value);
    // Automatically fetch last 30 days data when a product is selected
    setStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  }, []);

  // Automatically fetch data when product or date changes
  useEffect(() => {
    if (selectedProduct) {
      fetchChartAndSalesData();
    }
  }, [selectedProduct, startDate, endDate]);

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  // Ensure chartData is initialized before passing to Line
  const lineChartData = {
    labels: chartMainData?.labels || [],
    datasets: [
      {
        label: "Sales",
        data: chartMainData?.salesData || [],
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
      {
        label: "Refunds",
        data: chartMainData?.refundData || [],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
      },
    ],
  };

  // Apply search filter
  const tableRows =
    fetcher.data && fetcher.data.ordersTableData
      ? fetcher.data.ordersTableData
          .filter((order) => {
            const query = searchQuery.toLowerCase();
            return (
              order.orderNumber.toLowerCase().includes(query) ||
              order.customerName.toLowerCase().includes(query) ||
              order.customerEmail.toLowerCase().includes(query) ||
              order.orderedProducts.toLowerCase().includes(query) ||
              order.refundNote.toLowerCase().includes(query)
            );
          })
          .map((order) => [
            order.orderNumber,
            order.customerName,
            order.customerEmail,
            order.orderDate,
            order.orderedProducts,
            order.isRefunded,
            order.orderAmount,
            order.refundNote,
          ])
      : [];

  const options = uniqueProductTitles.map((title: string) => ({
    label: title,
    value: title,
  }));

  return (
    <Page fullWidth>
      <Layout>
        <Layout.Section>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Product Dropdown */}
            <h1>Products Details</h1>
            <Select
              label="Select a Product"
              options={options}
              onChange={handleSelectChange}
              value={selectedProduct}
            />

            {/* Show other components only when a product is selected */}
            {selectedProduct && (
              <>
                <Card>
                  <div
                    style={{
                      display: "flex",
                      gap: "25px",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TextField
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(value) => setStartDate(value)}
                      autoComplete="off"
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(value) => setEndDate(value)}
                      autoComplete="off"
                    />
                    <Button primary onClick={fetchChartAndSalesData}>
                      Apply
                    </Button>
                    <Button onClick={() => setDateRange(7)}>Last 7 Days</Button>
                    <Button onClick={() => setDateRange(30)}>
                      Last 30 Days
                    </Button>
                    <Button onClick={() => setDateRange(60)}>
                      Last 60 Days
                    </Button>
                  </div>
                </Card>

                {fetcher.state === "submitting" ||
                chartFetcher.state === "loading" ? (
                  <p>Loading data...</p>
                ) : (
                  <>
                    <Layout>
                      <Layout.Section>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "20px",
                          }}
                        >
                          <Card>
                            <div
                              style={{
                                fontSize: "30px",
                                marginBottom: "10px",
                                fontWeight: "bolder",
                              }}
                            >
                              <Text as="h1" variant="headingXl">
                                Total Order Sales: &nbsp;
                                {fetcher.data?.totalOrderPrice.toFixed(2) ?? 0}
                              </Text>
                            </div>
                            <Text as="p">
                              <strong>Total Orders:</strong>{" "}
                              {fetcher.data?.totalSales ?? 0}
                            </Text>
                          </Card>

                          {/* Gauge Components */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: "30px",
                            }}
                          >
                            <Card sectioned>
                              <RefundGauge
                                totalSales={
                                  fetcher.data?.totalOrderPrice
                                    ? Math.round(
                                        fetcher.data?.totalOrderPrice * 100,
                                      ) / 100
                                    : 0
                                }
                                totalRefunds=  {
                                  fetcher.data?.totalRefundAmount
                                    ? Math.round(
                                        fetcher.data?.totalRefundAmount * 100,
                                      ) / 100
                                    : 0
                                }
                              />
                              <Text variant="headingXl">
                                Total Refunds:
                                {
                                    fetcher.data?.totalRefundAmount
                                      ? Math.round(
                                          fetcher.data?.totalRefundAmount * 100,
                                        ) / 100
                                      : 0
                                  }
                              </Text>
                            </Card>
                            <Card>
                              <RefundGauge
                                 totalSales={
                                  fetcher.data?.totalOrderPrice
                                    ? Math.round(
                                        fetcher.data?.totalOrderPrice * 100,
                                      ) / 100
                                    : 0
                                }
                                totalRefunds={profit}
                                label="Profit %"
                                isSalesGauge
                              />
                              <Text variant="headingXl">
                                Total Profit: {profit.toFixed(2)}
                              </Text>
                            </Card>
                          </div>

                          {/* Sales and Refunds Line Chart */}
                          <Card sectioned>
                            <Line
                              data={lineChartData}
                              key={selectedProduct} // Add key to force re-render
                              options={{ maintainAspectRatio: false }} // Add this to help with rendering
                            />
                          </Card>

                          {/* Search Bar for Orders Table */}
                          <Card sectioned>
                            <TextField
                              label="Search Orders"
                              value={searchQuery}
                              onChange={(value) => setSearchQuery(value)}
                              autoComplete="off"
                              placeholder="Search by order number, customer name, or product"
                            />
                          </Card>

                          {/* Orders Table */}
                          <Card title="Order Details" sectioned>
                            <DataTable
                              columnContentTypes={[
                                "text",
                                "text",
                                "text",
                                "text",
                                "text",
                                "text",
                                "text",
                                "text",
                              ]}
                              headings={[
                                "Order #",
                                "Customer Name",
                                "Customer Email",
                                "Order Date",
                                "Ordered Products",
                                "Is Refunded",
                                "Order Amount",
                                "Refund Note",
                              ]}
                              rows={tableRows}
                            />
                          </Card>
                        </div>
                      </Layout.Section>
                    </Layout>
                  </>
                )}
              </>
            )}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
