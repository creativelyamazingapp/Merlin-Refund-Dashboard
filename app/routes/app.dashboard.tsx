import type { LoaderFunction } from "@remix-run/node";
import {
  Card,
  DataTable,
  Layout,
  Page,
  TextField,
  Button,
  Text,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { apiVersion, authenticate } from "~/shopify.server";
import { useLoaderData, useSubmit } from "@remix-run/react";
import RefundGauge from "../component/refund-gauge";
import { useState, useCallback, useEffect, useRef } from "react";
import { subDays, subMonths, format, addDays } from "date-fns"; // Import addDays
import "../component/style.css";
import LineChart from "../component/LineChart";
import Papa from "papaparse";
import {
  FaCopy,
  FaCheck,
  FaDownload,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";
import pkg from "react-copy-to-clipboard";
const { CopyToClipboard } = pkg;

  
const ordersQuery = (
  startDate: string,
  endDate: string,
  productId: string,
  status: string,
) => `
query FetchOrders($qty: Int, $after: String)

  {
    orders( first: $qty, after: $after, reverse: false, query: "created_at:>=${startDate} AND created_at:<${endDate} ${status ? `AND financial_status:${status}` : ""} ${productId ? `AND line_items.product_id:${productId}` : ""}") {
      edges {
      cursor
        node {
          id
          name
          email
          createdAt
          lineItems(first: 250) {
            edges {
              node {
                product {
                  id
                  title
                }
              }
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            firstName
            lastName
            email
          }
          refunds {
            id
            note
            refundLineItems(first: 10) {
              edges {
                node {
                  lineItem {
                    title
                    quantity
                    image {
                      originalSrc
                    }
                    product {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const productsQuery = `
query FetchProducts(first: $qty, after: $after, reverse: false,) 
  {
    products(first: $qty, after: $continueFrom, reverse: false) {
      edges {
      cursor
        node {
          id
          title
        }
      }
    }
  }
`;

const fetchRefundDetails = async (admin: any, refundId: string) => {
  const response = await admin.graphql(
    `#graphql
    query refund($input: ID!) {
      refund(id: $input) {
        totalRefundedSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
    }`,
    {
      variables: {
        input: refundId,
      },
    },
  );

  const data = await response.json();
  return data.data.refund.totalRefundedSet.shopMoney;
};

function extractProductId(gid: string) {
  const match = gid.match(/Product\/(\d+)$/);
  return match ? match[1] : null;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const today = new Date();
  const lastMonth = subMonths(today, 1);

  const startDate =
    url.searchParams.get("startDate") || format(lastMonth, "yyyy-MM-dd");
  const endDate =
    url.searchParams.get("endDate") || format(today, "yyyy-MM-dd"); // Remove the addDays here
  const rawProductId = url.searchParams.get("productId") || "";
  const productId = extractProductId(rawProductId);
  const status = url.searchParams.get("status") || "";

  const { admin, session } = await authenticate.admin(request);
  const { shop, accessToken } = session;

  try {
    const [ordersResponse, productsResponse] = await Promise.all([
      fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/graphql",
          "X-Shopify-Access-Token": accessToken!,
        },
        body: ordersQuery(startDate, endDate, productId!, status),
      }),
      fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/graphql",
          "X-Shopify-Access-Token": accessToken!,
        },
        body: productsQuery,
      }),
    ]);

    const ordersData = await ordersResponse.json();
    const productsData = await productsResponse.json();

    if (ordersData.errors || productsData.errors) {
      console.log("GraphQL Errors:", ordersData.errors || productsData.errors);
      return json(
        { errors: ordersData.errors || productsData.errors },
        { status: 400 },
      );
    }

    const orders = ordersData.data.orders.edges;
    const products = productsData.data.products.edges.map((edge: any) => ({
      label: edge.node.title,
      value: edge.node.id,
    }));

    for (const order of orders) {
      for (const refund of order.node.refunds) {
        const refundDetails = await fetchRefundDetails(admin, refund.id);
        refund.details = refundDetails;
      }
    }

    const storeIdentifier = shop.replace(".myshopify.com", "");

    return json({ orders, products, storeIdentifier });
  } catch (err) {
    console.error("Error fetching orders:", err);
    return json({ error: "Error fetching orders" }, { status: 500 });
  }
};

type LoaderData = {
  orders: any[];
  products: { label: string; value: string }[];
  storeIdentifier: string;
};

const ProfitDetails = () => {
  const { orders, products, storeIdentifier } = useLoaderData<LoaderData>();
  const submit = useSubmit();
  const today = new Date();
  const lastMonth = subMonths(today, 1);

  const [startDate, setStartDate] = useState(format(lastMonth, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd")); // Remove the addDays here
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState("");
  const [sortField, setSortField] = useState("");
  const [showRefunded, setShowRefunded] = useState<boolean | null>(null);
  const [sortedRows, setSortedRows] = useState<any[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<{ [key: number]: boolean }>(
    {},
  );
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [copiedEmailIndex, setCopiedEmailIndex] = useState<{
    [key: number]: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [selectedProductRefunds, setSelectedProductRefunds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchAll, setSearchAll] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const handleDateChange = (field: string) => (value: string) => {
    if (field === "startDate") setStartDate(value);
    if (field === "endDate") setEndDate(value); // Remove the addDays here
  };

  const handleProductChange = (value: string) => setProductId(value);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSelectedProductRefunds([]);
    const formData = new FormData();
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set("productId", productId);
    formData.set("status", status);
    submit(formData, { method: "get" });
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd")); // Remove the addDays here
    setLoading(true);
    setSelectedProductRefunds([]);
    const formData = new FormData();
    formData.set("startDate", format(start, "yyyy-MM-dd"));
    formData.set("endDate", format(end, "yyyy-MM-dd")); // Remove the addDays here
    formData.set("productId", productId);
    formData.set("status", status);
    submit(formData, { method: "get" });
  };

  useEffect(() => {
    setLoading(false);
  }, [orders]);

  const handleExport = () => {
    const dataToExport = orders.map((order) => ({
      orderId: getOrderID(order.node.id),
      createdAt: new Date(order.node.createdAt).toLocaleString(),
      refundedProducts:
        order.node.refunds.length > 0
          ? order.node.refunds[0].refundLineItems.edges
              .map(
                (item: any) =>
                  `${item.node.lineItem.title} (x${item.node.lineItem.quantity})`,
              )
              .join(", ")
          : "N/A",
      subtotalPrice: `${order.node.subtotalPriceSet.shopMoney.amount} ${order.node.subtotalPriceSet.shopMoney.currencyCode}`,
      shippingPrice: `${order.node.totalShippingPriceSet.shopMoney.amount} ${order.node.totalShippingPriceSet.shopMoney.currencyCode}`,
      totalPrice: `${order.node.totalPriceSet.shopMoney.amount} ${order.node.totalPriceSet.shopMoney.currencyCode}`,
      refundStatus: order.node.refunds.length > 0 ? "Yes" : "No",
      refundAmount:
        order.node.refunds.length > 0
          ? order.node.refunds.reduce(
              (acc: number, refund: any) =>
                acc + parseFloat(refund.details.amount),
              0,
            )
          : "N/A",
      customerName: order.node.customer
        ? `${order.node.customer.firstName} ${order.node.customer.lastName}`
        : "N/A",
      email: order.node.email,
      refundNotes:
        order.node.refunds.length > 0 ? order.node.refunds[0].note : "N/A",
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${startDate}_to_${endDate}.csv`;
    link.click();
  };

  const filteredOrders =
    showRefunded === null
      ? orders
      : orders.filter((order: any) =>
          showRefunded
            ? order.node.refunds.length > 0
            : order.node.refunds.length === 0,
        );

  const sortedOrders = filteredOrders.sort((a: any, b: any) => {
    switch (sortField) {
      case "date":
        return new Date(a.node.createdAt) > new Date(b.node.createdAt) ? 1 : -1;
      case "total":
        return (
          parseFloat(a.node.totalPriceSet.shopMoney.amount) -
          parseFloat(b.node.totalPriceSet.shopMoney.amount)
        );
      case "refund":
        return (
          parseFloat(
            a.node.refunds.reduce(
              (acc: number, refund: any) =>
                acc + parseFloat(refund.details.amount),
              0,
            ),
          ) -
          parseFloat(
            b.node.refunds.reduce(
              (acc: number, refund: any) =>
                acc + parseFloat(refund.details.amount),
              0,
            ),
          )
        );
      case "customer":
        return a.node.customer.firstName.localeCompare(
          b.node.customer.firstName,
        );
      default:
        return 0;
    }
  });

  const getOrderID = (gid: string) => {
    const parts = gid.split("/");
    return parts[parts.length - 1];
  };

  let totalSales = 0;
  let totalRefunds = 0;
  let mostRefundedProduct: {
    title: string;
    image: string | null;
    quantity: number;
    refundAmount: number;
    refundCount: number;
  } | null = null;
  const productRefundAmount: {
    [key: string]: {
      title: string;
      image: string | null;
      refundAmount: number;
      refundCount: number;
    };
  } = {};
  const refundReasons: {
    [note: string]: { count: number; refundAmount: number };
  } = {};
  const customerPurchaseCount: { [email: string]: number } = {};
  const topProducts: {
    [title: string]: { count: number; refundAmount: number };
  } = {};

  orders.forEach((order: any) => {
    totalSales += parseFloat(order.node.totalPriceSet.shopMoney.amount);
    order.node.refunds.forEach((refund: any) => {
      totalRefunds += parseFloat(refund.details.amount);
      if (refund.note) {
        if (!refundReasons[refund.note]) {
          refundReasons[refund.note] = { count: 0, refundAmount: 0 };
        }
        refundReasons[refund.note].count += 1;
        refundReasons[refund.note].refundAmount += parseFloat(
          refund.details.amount,
        );
      }
      refund.refundLineItems.edges.forEach((item: any) => {
        const productId = item.node.lineItem.product.id;
        if (!productRefundAmount[productId]) {
          productRefundAmount[productId] = {
            title: item.node.lineItem.title,
            image: item.node.lineItem.image
              ? item.node.lineItem.image.originalSrc
              : null,
            refundAmount: 0,
            refundCount: 0,
          };
        }
        productRefundAmount[productId].refundAmount += parseFloat(
          refund.details.amount,
        );
        productRefundAmount[productId].refundCount += 1;
      });
    });

    if (order.node.customer && order.node.email) {
      customerPurchaseCount[order.node.email] =
        (customerPurchaseCount[order.node.email] || 0) + 1;
    }
  });

  Object.values(productRefundAmount).forEach((product) => {
    if (
      !mostRefundedProduct ||
      product.refundAmount > mostRefundedProduct.refundAmount
    ) {
      mostRefundedProduct = product;
    }
  });

  const sortedRefundedProducts = Object.entries(productRefundAmount).sort(
    (a, b) => b[1].refundAmount - a[1].refundAmount,
  );
  const topRefundedProducts = sortedRefundedProducts.slice(0, 3);

  const sortedRefundReasons = Object.entries(refundReasons).sort(
    (a, b) => b[1].count - a[1].count,
  );
  const topRefundReasons = sortedRefundReasons.slice(0, 3);

  const sortedCustomers = Object.entries(customerPurchaseCount).sort(
    (a, b) => b[1] - a[1],
  );
  const topCustomers = sortedCustomers.slice(0, 3).map(([email]) => email);

  const sortedProducts = Object.entries(topProducts).sort(
    (a, b) => b[1].count - a[1].count,
  );
  const topProductsSold = sortedProducts.slice(0, 3);

  const profitPercentage =
    totalSales > 0 ? (totalSales - totalRefunds) / totalSales : 0;

  const rows = sortedOrders.flatMap((order: any) => {
    const refundDetails = order.node.refunds.flatMap((refund: any) => {
      return refund.refundLineItems.edges.map((item: any) => {
        const refundAmount = parseFloat(refund.details.amount);
        return {
          orderId: getOrderID(order.node.id),
          orderName: order.node.name,
          createdAt: new Date(order.node.createdAt).toLocaleString(),
          refundedProducts: (
            <a
              href={`https://${storeIdentifier}.myshopify.com/admin/products/${item.node.lineItem.product.id.split("/").pop()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {`${item.node.lineItem.title} (x${item.node.lineItem.quantity})`}
            </a>
          ),
          subtotalPrice: `${order.node.subtotalPriceSet.shopMoney.amount} ${order.node.subtotalPriceSet.shopMoney.currencyCode}`,
          shippingPrice: `${order.node.totalShippingPriceSet.shopMoney.amount} ${order.node.totalShippingPriceSet.shopMoney.currencyCode}`,
          totalPrice: `${order.node.totalPriceSet.shopMoney.amount} ${order.node.totalPriceSet.shopMoney.currencyCode}`,
          refundStatus: "Yes",
          refundAmount:
            refundAmount > 0
              ? `${refundAmount.toFixed(2)} ${order.node.totalPriceSet.shopMoney.currencyCode}`
              : "N/A",
          customerName: order.node.customer
            ? `${order.node.customer.firstName} ${order.node.customer.lastName}`
            : "N/A",
          email: order.node.email,
          refundNotes: refund.note ? refund.note : "N/A",
        };
      });
    });
    if (refundDetails.length === 0) {
      return [
        {
          orderId: getOrderID(order.node.id),
          createdAt: new Date(order.node.createdAt).toLocaleString(),
          refundedProducts: "N/A",
          subtotalPrice: `${order.node.subtotalPriceSet.shopMoney.amount} ${order.node.subtotalPriceSet.shopMoney.currencyCode}`,
          shippingPrice: `${order.node.totalShippingPriceSet.shopMoney.amount} ${order.node.totalShippingPriceSet.shopMoney.currencyCode}`,
          totalPrice: `${order.node.totalPriceSet.shopMoney.amount} ${order.node.totalPriceSet.shopMoney.currencyCode}`,
          refundStatus: "No",
          refundAmount: "N/A",
          customerName: order.node.customer
            ? `${order.node.customer.firstName} ${order.node.customer.lastName}`
            : "N/A",
          email: order.node.email,
          refundNotes: "N/A",
        },
      ];
    }
    return refundDetails;
  });

  const filteredRows = rows.filter(
    (row) =>
      (row.orderName &&
        row.orderName.toLowerCase().includes(searchAll.toLowerCase())) ||
      (row.customerName &&
        row.customerName.toLowerCase().includes(searchAll.toLowerCase())) ||
      (row.email &&
        row.email.toLowerCase().includes(searchAll.toLowerCase())) ||
      (row.refundNotes &&
        row.refundNotes.toLowerCase().includes(searchAll.toLowerCase())),
  );

  const rowsForTable = filteredRows.map((row, index) => [
    <a
      href={`https://admin.shopify.com/store/${storeIdentifier}/orders/${row.orderId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {row.orderName}
    </a>,
    row.createdAt,
    row.refundedProducts,
    row.subtotalPrice,
    row.shippingPrice,
    row.totalPrice,
    row.refundStatus,
    row.refundAmount,
    <>
      {row.customerName !== "N/A" &&
        row.customerName !== "N/A" &&
        row.customerName && (
          <div style={{ display: "flex", alignItems: "center" }}>
            {row.customerName}
            <CopyToClipboard
              text={row.customerName}
              onCopy={() => setCopiedIndex({ ...copiedIndex, [index]: true })}
            >
              <span className="copy-icon">
                {copiedIndex[index] ? (
                  <FaCheck style={{ marginLeft: 5 }} />
                ) : (
                  <FaCopy style={{ marginLeft: 5 }} />
                )}
              </span>
            </CopyToClipboard>
          </div>
        )}
    </>,
    <>
      {row.email !== "N/A" && row.email && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {row.email}
          <CopyToClipboard
            text={row.email}
            onCopy={() =>
              setCopiedEmailIndex({ ...copiedEmailIndex, [index]: true })
            }
          >
            <span className="copy-icon">
              {copiedEmailIndex[index] ? (
                <FaCheck style={{ marginLeft: 5 }} />
              ) : (
                <FaCopy style={{ marginLeft: 5 }} />
              )}
            </span>
          </CopyToClipboard>
        </div>
      )}
    </>,
    row.refundNotes,
  ]);

  const handleSort = useCallback(
    (index: number, direction: "ascending" | "descending") => {
      const sortedData = [...rowsForTable].sort((rowA, rowB) => {
        if (
          typeof rowA[index] === "string" &&
          typeof rowB[index] === "string"
        ) {
          return direction === "descending"
            ? rowB[index].localeCompare(rowA[index])
            : rowA[index].localeCompare(rowB[index]);
        } else if (
          typeof rowA[index] === "number" &&
          typeof rowB[index] === "number"
        ) {
          return direction === "descending"
            ? rowB[index] - rowA[index]
            : rowA[index] - rowB[index];
        } else if (rowA[index] instanceof Date && rowB[index] instanceof Date) {
          return direction === "descending"
            ? (rowB[index] as Date).getTime() - (rowA[index] as Date).getTime()
            : (rowA[index] as Date).getTime() - (rowB[index] as Date).getTime();
        }
        return 0;
      });
      setSortedRows(sortedData);
    },
    [rowsForTable],
  );

  const chartData = {
    labels: sortedOrders.map((order: any) =>
      new Date(order.node.createdAt).toLocaleDateString(),
    ),
    totalSales: sortedOrders.map((order: any) =>
      parseFloat(order.node.totalPriceSet.shopMoney.amount),
    ),
    totalRefunds: sortedOrders.map((order: any) =>
      order.node.refunds.reduce(
        (acc: number, refund: any) => acc + parseFloat(refund.details.amount),
        0,
      ),
    ),
  };

  const renderProductCard = (product: any, index: number) => {
    const titles = [
      "Top Refunded Product",
      "Second Most Refunded Product",
      "Third Most Refunded Product",
    ];
    return (
      <Card sectioned key={product.id}>
        <div
          style={{ cursor: "pointer" }}
          onClick={() => {
            setSelectedProduct(index);

            const refundData = orders.flatMap((order: any) =>
              order.node.refunds
                .filter((refund: any) =>
                  refund.refundLineItems.edges.some(
                    (item: any) => item.node.lineItem.title === product.title,
                  ),
                )
                .map((refund: any) => ({
                  orderId: getOrderID(order.node.id),
                  orderName: order.node.name,
                  orderDate: new Date(
                    order.node.createdAt,
                  ).toLocaleDateString(),
                  orderValue: `${order.node.totalPriceSet.shopMoney.amount} ${order.node.totalPriceSet.shopMoney.currencyCode}`,
                  refundedAmount: `${refund.details.amount} ${order.node.totalPriceSet.shopMoney.currencyCode}`,
                  customerName: order.node.customer
                    ? `${order.node.customer.firstName} ${order.node.customer.lastName}`
                    : "N/A",
                  customerEmail: order.node.email,
                  refundNotes: refund.note ? refund.note : "N/A",
                })),
            );
            setSelectedProductRefunds(refundData);
          }}
        >
          <Text variant="headingMd" fontWeight="bold">
            {titles[index]}
          </Text>
          {product.image && (
            <img
              src={product.image}
              alt={product.title}
              style={{
                borderRadius: "10px",
                width: "60px",
                height: "50px",
                // objectFit: "cover",
                marginBottom: "10px",
              }}
            />
          )}
          <h2 style={{ fontSize: "14px", fontWeight: "bold" }}>
            {product.title}
          </h2>
          <p>Number of Items Refunded: {product.refundCount}</p>
          <p>
            Refunded Amount: {product.refundAmount.toFixed(2)}{" "}
            {product.currencyCode}
          </p>
        </div>
      </Card>
    );
  };

  const renderSelectedProduct = () => {
    if (topRefundedProducts.length === 0) {
      return (
        <Card sectioned>
          <div style={{ width: "100%" }}>
            <h1 style={{ fontSize: "20px" }}>
              No refunded products found in the selected date range.
            </h1>
          </div>
        </Card>
      );
    }

    const product = topRefundedProducts[selectedProduct]?.[1];
    if (!product) {
      return (
        <Card sectioned>
          <div style={{ width: "100%" }}>
            <h1 style={{ fontSize: "20px" }}>
              Selected product is not available in the current data.
            </h1>
          </div>
        </Card>
      );
    }

    const titles = [
      "Top Refunded Product",
      "Second Most Refunded Product",
      "Third Most Refunded Product",
    ];
    return (
      <Card sectioned>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <Text variant="headingXl">
            {titles[selectedProduct] || "Refunded Product"}
          </Text>

          {product.image && (
            <img
              src={product.image}
              alt={product.title}
              style={{
                borderRadius: "10px",
                width: "250px",
                height: "100px",
                // width: "100%%",
                // height: "100%",
                objectFit: "contain",
                marginBottom: "10px",
              }}
            />
          )}
          <h2 style={{ fontSize: "18px", fontWeight: "bold" }}>
            {product.title}
          </h2>
          <p>Number of Items Refunded: {product.refundCount}</p>
          <p>
            Refunded Amount: {product.refundAmount.toFixed(2)}{" "}
            {product.currencyCode}
          </p>
        </div>
      </Card>
    );
  };

  const RefundTable = ({ refunds, storeIdentifier }) => {
    const [copiedIndex, setCopiedIndex] = useState({});
    const [copiedEmailIndex, setCopiedEmailIndex] = useState({});
    const [refundSearchTerm, setRefundSearchTerm] = useState("");
    const refundSearchRef = useRef(null);

    const filteredRefunds = refunds.filter(
      (refund) =>
        (refund.orderName &&
          refund.orderName
            .toLowerCase()
            .includes(refundSearchTerm.toLowerCase())) ||
        (refund.customerName &&
          refund.customerName
            .toLowerCase()
            .includes(refundSearchTerm.toLowerCase())) ||
        (refund.refundNotes &&
          refund.refundNotes
            .toLowerCase()
            .includes(refundSearchTerm.toLowerCase())),
    );

    const rows = filteredRefunds.map((refund, index) => [
      <a
        href={`https://admin.shopify.com/store/${storeIdentifier}/orders/${refund.orderId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {refund.orderName}
      </a>,
      refund.orderDate,
      refund.orderValue,
      refund.refundedAmount,
      <>
        {refund.customerName !== "N/A" && refund.customerName && (
          <div style={{ display: "flex", alignItems: "center" }}>
            {refund.customerName}
            <CopyToClipboard
              text={refund.customerName}
              onCopy={() => setCopiedIndex({ ...copiedIndex, [index]: true })}
            >
              <span className="copy-icon">
                {copiedIndex[index] ? (
                  <FaCheck style={{ marginLeft: 5 }} />
                ) : (
                  <FaCopy style={{ marginLeft: 5 }} />
                )}
              </span>
            </CopyToClipboard>
          </div>
        )}
      </>,
      <>
        {refund.customerEmail !== "N/A" && refund.customerEmail && (
          <div style={{ display: "flex", alignItems: "center" }}>
            {refund.customerEmail}
            <CopyToClipboard
              text={refund.customerEmail}
              onCopy={() =>
                setCopiedEmailIndex({ ...copiedEmailIndex, [index]: true })
              }
            >
              <span className="copy-icon">
                {copiedEmailIndex[index] ? (
                  <FaCheck style={{ marginLeft: 5 }} />
                ) : (
                  <FaCopy style={{ marginLeft: 5 }} />
                )}
              </span>
            </CopyToClipboard>
          </div>
        )}
      </>,
      refund.refundNotes,
    ]);

    const handleSearchTermChange = useCallback((value) => {
      setRefundSearchTerm(value);
    }, []);

    useEffect(() => {
      if (refundSearchRef.current) {
        refundSearchRef.current.focus();
      }
    }, [refundSearchTerm]);

    return (
      <Card sectioned>
        <Text variant="headingLg">Refund Details</Text>
        <TextField
          label="Search by Order Id, Customer Name, Email or Refund Notes"
          value={refundSearchTerm}
          onChange={handleSearchTermChange}
          autoComplete="off"
          ref={refundSearchRef}
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
            "Order ID",
            "Order Date",
            "Order Value",
            "Refunded Amount",
            "Customer Name",
            "Customer Email",
            "Refund Note",
          ]}
          rows={rows}
        />
      </Card>
    );
  };

  const totalPages = Math.ceil(rowsForTable.length / rowsPerPage);
  const paginatedRows = rowsForTable.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  return (
    <Page fullWidth>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <h1 className="loading-text">Loading...</h1>
        </div>
      )}

      <Layout>
        {/* Main Top Section */}
        <Layout.Section>
          <div className="responsive-layout">
            {/* Top Main Left - Total Sales, Guage and Chart Components */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                // justifyContent: "space-between",
                gap: "20px",
              }}
            >
              <div>
                <Card sectioned>
                  <Text variant="headingLg">
                    Total Sales: {totalSales.toFixed(2)}{" "}
                    {orders[0]?.node.totalPriceSet.shopMoney.currencyCode}
                  </Text>
                </Card>
              </div>
              <div>
                <form onSubmit={handleSubmit}>
                  <Card>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <TextField
                          label="Start Date"
                          type="date"
                          value={startDate}
                          onChange={handleDateChange("startDate")}
                          autoComplete="off"
                        />
                        <TextField
                          label="End Date"
                          type="date"
                          value={endDate}
                          onChange={handleDateChange("endDate")}
                          autoComplete="off"
                        />
                        <Button primary submit disabled={loading}>
                          Apply
                        </Button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "5px",
                          alignSelf: "center",
                        }}
                      >
                        <Button onClick={() => setDateRange(7)}>
                          Last 7 Days
                        </Button>
                        <Button onClick={() => setDateRange(30)}>
                          Last 30 Days
                        </Button>
                        <Button onClick={() => setDateRange(60)}>
                          Last 60 Days
                        </Button>
                      </div>
                    </div>
                  </Card>
                </form>
              </div>
              {/* Guage and Chart Components */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  marginTop: "3%",
                  marginBottom: "3%",
                  // gap: "10px",
                }}
              >
                <div className="responsive-layout">
                  <div>
                    <Card sectioned>
                      <div style={{ display: "flex-row", textAlign: "center" }}>
                        <RefundGauge
                          totalSales={totalSales}
                          totalRefunds={totalRefunds}
                        />
                        <Text variant="headingMd">Total Refunds:</Text>
                        <Text variant="headingXl">
                          {totalRefunds.toFixed(2)}{" "}
                          {orders[0]?.node.totalPriceSet.shopMoney.currencyCode}
                        </Text>
                        <p></p>
                      </div>
                    </Card>
                  </div>
                  <div>
                    <Card sectioned>
                      <div style={{ display: "flex-row", textAlign: "center" }}>
                        <RefundGauge
                          totalSales={totalSales}
                          totalRefunds={totalSales - totalRefunds}
                          label="Profit %"
                          isSalesGauge
                        />
                        <Text variant="headingMd">Net Profit: </Text>
                        <Text variant="headingXl">
                          {parseFloat((totalSales - totalRefunds).toFixed(2))}{" "}
                          {orders[0]?.node.totalPriceSet.shopMoney.currencyCode}
                        </Text>
                      </div>
                    </Card>
                  </div>
                </div>
                <Card>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "40vh",
                      width: "",
                    }}
                  >
                    <LineChart data={chartData} />
                  </div>
                </Card>
              </div>
            </div>

            {/* Main Right Side */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {/* Reasons for Refund Card */}
              <div style={{justifyContent: "center", textAlign: "center",width: "100%"}}>
                <Card sectioned>
                  <div style={{ marginBottom: "8px" }}>
                    <Text variant="headingXl">Reasons for Refund</Text>
                  </div>
                  {topRefundReasons.map(
                    ([reason, { count, refundAmount }], index) => (
                      <div key={index} style={{ marginBottom: "15px" }}>
                        <Text variant="headingXs">
                          {index + 1 === 1
                            ? "Top"
                            : index + 1 === 2
                              ? "Second"
                              : "Third"}
                          :{" "}
                          <span
                            style={{ fontWeight: "bold", fontSize: "18px" }}
                          >
                            {reason}
                          </span>
                        </Text>
                        <Text>Number of Refunded orders: {count}</Text>
                        <Text>
                          Refund amount: {refundAmount.toFixed(2)}{" "}
                          {orders[0]?.node.totalPriceSet.shopMoney.currencyCode}
                        </Text>
                      </div>
                    ),
                  )}
                  <div
                    style={{
                      background: "#f2f7f4",
                      borderRadius: "10px",
                      padding: "3px",
                    }}
                  >
                    <Text variant="headingMd" as="h6">
                      Total Amount Refunded due to these Reasons:{" "}
                      <span style={{ fontWeight: "bolder" }}>
                        {" "}
                        {topRefundReasons
                          .reduce(
                            (acc, [, { refundAmount }]) => acc + refundAmount,
                            0,
                          )
                          .toFixed(2)}{" "}
                        {orders[0]?.node.totalPriceSet.shopMoney.currencyCode}
                      </span>
                    </Text>
                  </div>
                </Card>
              </div>
              {/* Top Refunded Product Left Section */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Card sectioned>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {renderSelectedProduct()}
                  </div>
                </Card>
              </div>
              {/* Second/ Third Top Refunded Products Cards */}
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", textAlign: "center" }}>
                <Card sectioned>
                  {topRefundedProducts.length > 1 ? (
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        gap: "8px",
                      }}
                    >
                      {topRefundedProducts
                        .filter((_, index) => index !== selectedProduct)
                        .map((product, index) =>
                          renderProductCard(
                            product[1],
                            topRefundedProducts.indexOf(product),
                          ),
                        )}
                    </div>
                  ) : (
                    <div style={{ width: "100%" }}>
                      <h1 style={{ fontSize: "20px" }}>
                        No refunded products found in the selected date range.
                      </h1>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </Layout.Section>
        {/* Refunded Products Table */}
        <Layout.Section>
          {selectedProductRefunds.length > 0 && (
            <RefundTable refunds={selectedProductRefunds} />
          )}
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <Button
                  onClick={() => setShowRefunded(true)}
                  disabled={showRefunded === true}
                >
                  Show Refunded Orders
                </Button>
                <Button
                  onClick={() => setShowRefunded(false)}
                  disabled={showRefunded === false}
                >
                  Show Non-Refunded Orders
                </Button>
                <Button
                  onClick={() => setShowRefunded(null)}
                  disabled={showRefunded === null}
                >
                  Show All Orders
                </Button>
              </div>
              <FaDownload
                onClick={handleExport}
                style={{ cursor: "pointer" }}
              />
            </div>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <TextField
              label="Search by Order Id, Customer Name, Email or Refund Notes"
              value={searchAll}
              onChange={(value) => setSearchAll(value)}
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
                "text",
                "text",
                "text",
                "text",
              ]}
              headings={[
                "Order ID",
                "Created At",
                "Refunded Products",
                "Subtotal Price",
                "Shipping Price",
                "Total Price",
                "Refund Status",
                "Refund Amount",
                "Customer Name",
                "Email",
                "Refund Notes",
              ]}
              rows={sortedRows.length > 0 ? sortedRows : paginatedRows}
              sortable={[
                false,
                true,
                false,
                true,
                true,
                true,
                true,
                true,
                false,
                false,
                false,
              ]}
              defaultSortDirection="descending"
              initialSortColumnIndex={1}
              onSort={handleSort}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
              }}
            >
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <FaArrowLeft /> Previous
              </Button>
              <Text variant="bodyMd" as="p" alignment="center">
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next <FaArrowRight />
              </Button>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default ProfitDetails;
