import { useState, useEffect } from "react";
import { useSubmit, useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Text,
  DataTable,
} from "@shopify/polaris";
import { format, subDays, subMonths } from "date-fns";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import RefundGauge from "../component/refund-gauge";
import "../component/style.css";
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

// Initialize Prisma Client
const prisma = new PrismaClient();

// Define the type for the loader data
type LoaderData = {
  totalSalesAmount: number;
  currencyCode: string;
  totalRefundAmount: number;
  totalProfit: number;
  totalRefundedAmount: number;
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
  currentPage: number;
  totalPages: number;
  // overallData: {
  //   totalSalesAmount: number;
  //   totalRefundAmount: number;
  //   totalProfit: number;
  // };
  allOrders: any[]; // Holds all orders for search functionality
};

export const loader: LoaderFunction = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const filterType = url.searchParams.get("filterType") || "All";

  console.log("Loader received filterType:", filterType);
  console.log("Loader received page:", page);

  // Convert to Date object
  const startDate = startDateParam ? new Date(startDateParam) : null;
  const endDate = endDateParam ? new Date(endDateParam) : null;

  // Define filter logic based on filterType (Refunded, Non-Refunded, All)
  let refundedFilter = {};
  if (filterType === "Refunded") {
    refundedFilter = {
      refunds: {
        some: {}, // Orders with refunds
      },
    };
  } else if (filterType === "Non-Refunded") {
    refundedFilter = {
      refunds: {
        none: {}, // Orders without refunds
      },
    };
  }

  // Define page limit
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // Fetch total sales and refunds using Prisma's aggregation function
  const salesAggregate = await prisma.order.aggregate({
    _sum: { totalPrice: true },
    where: {
      shop: session.shop,
      createdAt: {
        gte: startDate || undefined,
        lte: endDate || undefined,
      },
    },
  });

  const refundsAggregate = await prisma.refund.aggregate({
    _sum: { amount: true },
    where: {
      order: {
        shop: session.shop,
        createdAt: {
          gte: startDate || undefined,
          lte: endDate || undefined,
        },
      },
    },
  });

  // Fetch all orders (not just the current page) for searching
  const allOrders = await prisma.order.findMany({
    where: {
      shop: session.shop,
      createdAt: {
        gte: startDate || undefined,
        lte: endDate || undefined,
      },
      ...refundedFilter,
    },
    include: {
      lineItems: true,
      refunds: true,
    },
  });

  // Fetch the orders for the current page
  const orders = await prisma.order.findMany({
    where: {
      shop: session.shop,
      createdAt: {
        gte: startDate || undefined,
        lte: endDate || undefined,
      },
      refunds:
        filterType === "Refunded"
          ? { some: {} }
          : filterType === "Non-Refunded"
            ? { none: {} }
            : undefined,
    },
    include: {
      lineItems: true,
      refunds: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    skip,
    take: pageSize,
  });

  // Prepare the table data
  const ordersTableData = orders.map((order) => {
    const products = order.lineItems.map((item) => item.title).join(", ");
    const isRefunded = order.refunds.length > 0 ? "Yes" : "No";
    const refundNote =
      order.refunds.length > 0 ? order.refunds[0].note || "No Note" : "N/A";

    return {
      orderNumber: order.name,
      customerName: `${order.customerFirstName || "N/A"} ${
        order.customerLastName || "N/A"
      }`,
      customerEmail: order.email || '',
      orderDate: format(order.createdAt, "yyyy-MM-dd"),
      orderedProducts: products,
      isRefunded,
      orderAmount: order.totalPrice.toFixed(2),
      refundNote,
    };
  });

  // Prepare the data for all orders for search purposes
  const allOrdersTableData = allOrders.map((order) => {
    const products = order.lineItems.map((item) => item.title).join(", ");
    const isRefunded = order.refunds.length > 0 ? "Yes" : "No";
    const refundNote =
      order.refunds.length > 0 ? order.refunds[0].note || "No Note" : "N/A";

    return {
      orderNumber: order.name,
      customerName: `${order.customerFirstName || "N/A"} ${
        order.customerLastName || "N/A"
      }`,
      customerEmail: order.email || '',
      orderDate: format(order.createdAt, "yyyy-MM-dd"),
      orderedProducts: products,
      isRefunded,
      orderAmount: order.totalPrice.toFixed(2),
      refundNote,
    };
  });

  // Access the _sum properties directly after the query
  const totalSalesAmount = salesAggregate._sum.totalPrice || 0;
  const totalRefundAmount = refundsAggregate._sum.amount || 0;

  // Calculate total profit
  const totalProfit = totalSalesAmount - totalRefundAmount;

  // const overallData = {
  //   totalSalesAmount,
  //   totalRefundAmount,
  //   totalProfit,
  // };

  return json<LoaderData>({
    totalSalesAmount,
    currencyCode: orders[0]?.currencyCode || "USD",
    totalRefundAmount,
    totalProfit,
    totalRefundedAmount: totalRefundAmount,
    ordersTableData,
    currentPage: page,
    totalPages: Math.ceil(allOrders.length / pageSize),
    // overallData,
    allOrders: allOrdersTableData, // Provide all orders for search
  });
};

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [searchTopPro, setSearchTopPro] = useState(""); // State for search query

  const [startChartDate, setStartChartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd"),
  );
  const [loading, setLoading] = useState(false);
  const [endChartDate, setEndChartDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [chartRefundAmount, setChartRefundAmount] = useState(0);
  const [chartProfit, setChartProfit] = useState(0);
  const [chartMainData, setChartMainData] = useState([]);
  const [topRefundedProducts, setTopRefundedProducts] = useState([]);
  const [topReasons, setTopReasons] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refundDetails, setRefundDetails] = useState([]);
  const [topRefundedAmount, setTopRefundedAmount] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");


  const fetcher = useFetcher();

  const {
    currencyCode,
    totalRefundedAmount,
    ordersTableData,
    currentPage,
    totalPages,
    totalSalesAmount,
    totalProfit,
    totalRefundAmount,
    // overallData,
    allOrders,
  } = useLoaderData<LoaderData>();

  const [filterType, setFilterType] = useState("All");
  const [filteredRows, setFilteredRows] = useState([]);
  const pageSize = 10; // Number of rows per page

  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchChartData = () => {
    setLoading(true);
    const fullUrl = `/chartData?startDate=${startDate}&endDate=${endDate}`;
    fetcher.load(fullUrl);
  };

  useEffect(() => {
    fetcher.load(`/chartData?startDate=${startDate}&endDate=${endDate}`);
  }, [startDate, endDate]);

  useEffect(() => {
    if (fetcher.data) {
      const {
        totalRefundAmount,
        totalProfit,
        chartData,
        topReasons,
        topRefundedProducts,
        refundedProducts,
        totalRefundAmountFromTopReasons,
      } = fetcher.data;
      setChartRefundAmount(totalRefundAmount);
      setChartProfit(totalProfit);
      setChartMainData(chartData);
      setTopReasons(topReasons);
      setTopRefundedProducts(topRefundedProducts);
      setTopRefundedAmount(totalRefundAmountFromTopReasons);
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    fetchChartData();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [allOrders]);

  const submit = useSubmit();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setRefundDetails([]); // Ensure data is set to an array
    const formData = new FormData();
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    submit(formData, { method: "get" });
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setLoading(true);

    const formData = new FormData();
    formData.set("startDate", format(start, "yyyy-MM-dd"));
    formData.set("endDate", format(end, "yyyy-MM-dd"));
    submit(formData, { method: "get" });
  };

  const lineChartData = {
    labels: chartMainData.labels,
    datasets: [
      {
        label: "Sales",
        data: chartMainData.salesData,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
      {
        label: "Refunds",
        data: chartMainData.refundData,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
      },
    ],
  };

  const columnHeaders = [
    "Order #",
    "Customer Name",
    "Email",
    "Order Date",
    "Ordered Products",
    "Is Refunded",
    "Order Amount",
    "Refund Note",
  ];

  useEffect(() => {
    const rows = (searchQuery ? allOrders : ordersTableData)
      .filter((order) => {
        if (filterType === "Refunded") return order.isRefunded === "Yes";
        if (filterType === "Non-Refunded") return order.isRefunded === "No";
        return true;
      })
      .filter((order) => {
        const query = searchQuery.toLowerCase().trim();
        return (
          order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.orderedProducts.toLowerCase().includes(query)
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
      ]);
    setFilteredRows(rows);
  }, [filterType, searchQuery, ordersTableData, allOrders]);

  const changeFilter = (filterType) => {
    setFilterType(filterType);
    const url = new URL(window.location.href);
    url.searchParams.set("filterType", filterType);
    url.searchParams.set("page", "1");
    submit(url.searchParams, { method: "get" });
  };

  const goToPage = (page) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", page.toString());
    submit(url.searchParams, { method: "get" });
  };

  const handleProductClick = async (product) => {
    console.log("Product clicked:", product);
    setSelectedProduct(product);

    try {
      // Fetch refund details for the selected product using title
      const response = await fetch(
        `/chartData?productTitle=${encodeURIComponent(product.title)}&startDate=${startDate}&endDate=${endDate}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch refund details");
      }

      const data = await response.json();
      console.log("Fetched refund details:", data); // Check the structure of the response
      setRefundDetails(data.refundDetails || []); // Ensure data is set to an array
    } catch (error) {
      console.error("Error fetching refund details:", error);
      setRefundDetails([]); // Reset to an empty array on error
      setErrorMessage("Please contact support."); // Set error message

    }
  };

  const handleProductClickWrapper = (product) => () => {
    console.log("Product click wrapper triggered");
    handleProductClick(product);
  };

  useEffect(() => {
    // Reset refundDetails and selectedProduct on component mount (page reload)
    setRefundDetails([]);
    setSelectedProduct(null);
  }, []); // Empty dependency array ensures this runs only on mount

  const filteredRefundDetails = refundDetails.filter(
    (detail) =>
      detail.orderNumber.toLowerCase().includes(searchTopPro.toLowerCase()) ||
      detail.customerName.toLowerCase().includes(searchTopPro.toLowerCase()) ||
      (detail.email?.toLowerCase() || "").includes(searchTopPro.toLowerCase()) ||
      detail.refundNotes.toLowerCase().includes(searchTopPro.toLowerCase()),
  );

  return (
    <Page fullWidth>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <h1 className="loading-text">Loading...</h1>
        </div>
      )}
        {errorMessage && (
      <Card sectioned>
        <Text variant="critical" color="red">
          {errorMessage}
        </Text>
      </Card>
    )}

      <Layout>
        <div className="responsive-layout">
          <div>
            {/* Date Selector with Apply Button */}
            <Layout.Section>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <Card sectioned>
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
                    <Button primary onClick={handleSubmit} disabled={loading}>
                      Apply
                    </Button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "25px",
                      marginTop: "10px",
                      justifyContent: "center",
                    }}
                  >
                    <Button onClick={() => setDateRange(7)}>Last 7 Days</Button>
                    <Button onClick={() => setDateRange(30)}>
                      Last 30 Days
                    </Button>
                    <Button onClick={() => setDateRange(60)}>
                      Last 60 Days
                    </Button>
                  </div>
                </Card>

                {/* Total Sales Card */}
                <Card sectioned>
                  <Text variant="headingLg">
                    Total Sales: {totalSalesAmount.toFixed(2)} {currencyCode}
                  </Text>
                </Card>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  }}
                >
                  {/* Total Refunds and Profit Cards */}
                  <Card sectioned>
                    <div style={{ display: "flex-row", textAlign: "center" }}>
                      {/* RefundGauge component */}
                      <RefundGauge
                        totalSales={totalSalesAmount}
                        totalRefunds={totalRefundAmount}
                      />
                      <Text variant="headingXl">
                        Total Refunds: {totalRefundAmount.toFixed(2)}{" "}
                        {currencyCode}
                      </Text>
                    </div>
                  </Card>

                  <Card sectioned>
                    <div style={{ display: "flex-row", textAlign: "center" }}>
                      {/* RefundGauge component */}
                      <RefundGauge
                        totalSales={totalSalesAmount}
                        totalRefunds={totalSalesAmount - totalRefundAmount}
                        label="Profit %"
                        isSalesGauge
                      />
                      <Text variant="headingXl">
                        Total Profit: {totalProfit.toFixed(2)} {currencyCode}
                      </Text>
                    </div>
                  </Card>
                </div>
                {/* Sales and Refunds Line Chart */}
                <Card sectioned>
                  <Line data={lineChartData} />
                </Card>
              </div>
            </Layout.Section>
          </div>

          {/* Reasons for Refund */}
          <div>
            <Layout.Section>
              <Card sectioned>
                <span
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "5px",
                  }}
                >
                  <Text variant="headingXl">Reasons for Refund</Text>
                </span>

                {topReasons && topReasons.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexFlow: "column",
                      justifyContent: "center",
                      alignContent: "center",
                      textAlign: "center",
                    }}
                  >
                    {topReasons.map(
                      (reason, index) =>
                        reason.count > 0 &&
                        reason.refundAmount > 0 && (
                          <div key={index} style={{ marginBottom: "15px" }}>
                            <Text variant="headingXs">
                              {index === 0
                                ? "Top"
                                : index === 1
                                  ? "Second"
                                  : "Third"}
                              :{" "}
                              <span
                                style={{ fontWeight: "bold", fontSize: "18px" }}
                              >
                                {reason.reason}
                              </span>
                            </Text>
                            <Text>
                              Number of Refunded orders: {reason.count || 0}
                            </Text>
                            <Text>
                              Refund amount: {reason.refundAmount.toFixed(2)}{" "}
                              {currencyCode}
                            </Text>
                          </div>
                        ),
                    )}
                    <div
                      style={{
                        background: "#f2f7f4",
                        borderRadius: "10px",
                        padding: "3px",
                        marginTop: "15px",
                      }}
                    >
                      <Text variant="headingMd">
                        Total Amount Refunded due to these Reasons:{" "}
                        {topRefundedAmount.toFixed(2)} {currencyCode}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div>No refund reasons found.</div>
                )}
              </Card>
            </Layout.Section>
            {/* Top Refunded Products */}
            <Layout.Section>
              <div>
                <Card sectioned>
                  <Text variant="headingXl">Top Refunded Products</Text>

                  {topRefundedProducts.length === 0 && (
                    <div>No Refunded Product Data in the selected dates.</div>
                  )}

                  {topRefundedProducts.length > 0 && (
                    <div>
                      {topRefundedProducts.length === 3 ? (
                        <>
                          {/* Show the first item on top */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              marginBottom: "20px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "20px",
                              }}
                              onClick={handleProductClickWrapper(
                                topRefundedProducts[0],
                              )}
                            >
                              <div
                                style={{
                                  textAlign: "center",
                                  cursor: "pointer",
                                }}
                              >
                                {topRefundedProducts[0].productUrl && (
                                  <img
                                    src={topRefundedProducts[0].productUrl}
                                    alt={topRefundedProducts[0].title}
                                    style={{
                                      height: "100px",
                                      marginBottom: "10px",
                                    }}
                                  />
                                )}
                                <Text variant="headingLg">
                                  {topRefundedProducts[0].title}
                                </Text>
                                <Text>
                                  Number of Times Refunded:{" "}
                                  {topRefundedProducts[0].refundCount}{" "}
                                </Text>
                                <Text>
                                  Number of Amount Refunded:{" "}
                                  {topRefundedProducts[0].totalRefundAmount.toFixed(
                                    2,
                                  )}{" "}
                                </Text>
                              </div>
                            </div>
                          </div>

                          {/* Show the next two items side by side at the bottom */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: "50px",
                            }}
                          >
                            {topRefundedProducts
                              .slice(1)
                              .map((product, index) => (
                                <div
                                  key={index}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    padding: "10px",
                                    border: "1px solid #ccc",
                                    borderRadius: "20px",
                                  }}
                                  onClick={handleProductClickWrapper(product)}
                                >
                                  <div
                                    style={{
                                      textAlign: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {product.productUrl && (
                                      <img
                                        src={product.productUrl}
                                        alt={product.title}
                                        style={{
                                          height: "100px",
                                          marginBottom: "10px",
                                        }}
                                      />
                                    )}
                                    <Text variant="headingLg">
                                      {product.title}
                                    </Text>
                                    <Text>
                                      Number of Orders Refunded:{" "}
                                      {product.refundCount}{" "}
                                    </Text>
                                    <Text>
                                      Amount Refunded:{" "}
                                      {product.totalRefundAmount.toFixed(2)}{" "}
                                    </Text>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </>
                      ) : (
                        // If there are 2 or fewer products, display them side by side
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "50px",
                          }}
                        >
                          {topRefundedProducts.map((product, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                padding: "10px",
                                border: "1px solid #ccc",
                                borderRadius: "20px",
                              }}
                              onClick={handleProductClickWrapper(product)}
                            >
                              <div
                                style={{
                                  textAlign: "center",
                                  cursor: "pointer",
                                }}
                              >
                                {product.productUrl && (
                                  <img
                                    src={product.productUrl}
                                    alt={product.title}
                                    style={{
                                      height: "100px",
                                      marginBottom: "10px",
                                    }}
                                  />
                                )}
                                <Text variant="headingLg">{product.title}</Text>
                                <Text>
                                  Number of Times Refunded:{" "}
                                  {product.refundCount}{" "}
                                </Text>
                                <Text>
                                  Number of Orders Refunded:{" "}
                                  {product.totalRefundAmount.toFixed(2)}{" "}
                                </Text>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>

              {topRefundedProducts.length > 0 && (
                <div>
                  {selectedProduct && (
                    <Card sectioned>
                      <Text variant="headingLg">
                        Refund Details for {selectedProduct.title}
                      </Text>

                      {/* Search Bar for Refund Details */}
                      <TextField
                        label="Search Refund Details"
                        value={searchTopPro}
                        onChange={(value) => setSearchTopPro(value)}
                        placeholder="Search by order number, customer name, email or refund notes"
                        autoComplete="off"
                      />

                      <DataTable
                        columnContentTypes={[
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
                          "Order Date",
                          "Refund Date",
                          "Customer Name",
                          "Customer Email",
                          "Refunded Amount",
                          "Refund Notes",
                        ]}
                        rows={filteredRefundDetails.map((detail) => [
                          detail.orderNumber,
                          detail.orderDate.substring(0, 10),
                          detail.refundDate.substring(0, 10),
                          detail.customerName,
                          detail.email,
                          detail.refundAmount.toFixed(2),
                          detail.refundNotes,
                        ])}
                      />
                    </Card>
                  )}
                </div>
              )}
            </Layout.Section>
          </div>
        </div>

        <Layout.Section id="table-section">
          <div style={{ width: "full" }}>
            <Card sectioned>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                }}
              >
                <Button
                  variant={filterType === "All" ? "primary" : "plain"}
                  onClick={() => changeFilter("All")}
                >
                  All Orders
                </Button>
                <Button
                  variant={filterType === "Refunded" ? "primary" : "plain"}
                  onClick={() => changeFilter("Refunded")}
                >
                  Refunded Orders
                </Button>
                <Button
                  variant={filterType === "Non-Refunded" ? "primary" : "plain"}
                  onClick={() => changeFilter("Non-Refunded")}
                >
                  Non-Refunded Orders
                </Button>
              </div>
            </Card>

            <Card sectioned>
              <TextField
                label="Search Orders"
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                autoComplete="off"
                placeholder="Search by order number, customer name, or product"
              />
            </Card>

            <Card title="Order Details">
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
                headings={columnHeaders}
                rows={filteredRows}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "20px",
                }}
              >
                {/* Conditionally render Previous button */}
                {currentPage > 1 ? (
                  <Button onClick={() => goToPage(currentPage - 1)}>
                    Previous
                  </Button>
                ) : (
                  <div />
                )}

                <Text variant="bodyMd">
                  Page {currentPage} of {totalPages}
                </Text>

                {/* Conditionally render Next button */}
                {currentPage < totalPages ? (
                  <Button onClick={() => goToPage(currentPage + 1)}>
                    Next
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Dashboard;
