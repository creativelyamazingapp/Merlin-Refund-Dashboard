import type { LoaderFunction } from "@remix-run/node";
import {
  Card,
  DataTable,
  Layout,
  Page,
  Text,
  Select,
  TextField,
  Button,
  Spinner,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import RefundGauge from "../component/refund-gauge";
import { useState, useEffect } from "react";
import { subMonths, format } from "date-fns";
import "../component/style.css";
import LineChart from "../component/LineChart";
import { FaCopy, FaCheck } from "react-icons/fa";
import pkg from "react-copy-to-clipboard";

const { CopyToClipboard } = pkg;

type LoaderData = {
  products: { label: string; value: string }[];
  orders: any[];
  totalSales: number;
  totalRefunds: number;
  shop: string;
};

const ProductDetails = () => {
  const fetcher = useFetcher();
  const [shop, setShop] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalRefunds, setTotalRefunds] = useState(0);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<{ [key: number]: boolean }>(
    {},
  );
  const [copiedEmailIndex, setCopiedEmailIndex] = useState<{
    [key: number]: boolean;
  }>({});
  const [selectedProductName, setSelectedProductName] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchProductData = (productId: string) => {
    setLoading(true);
    const fullUrl = `/advanceLayoutProducts?startDate=${startDate}&endDate=${endDate}&productId=${encodeURIComponent(productId)}`;
    fetcher.load(fullUrl);
  };

  useEffect(() => {
    fetcher.load(
      `/advanceLayoutProducts?startDate=${startDate}&endDate=${endDate}`,
    );
  }, [startDate, endDate]);

  useEffect(() => {
    if (fetcher.data) {
      const { products, orders, totalSales, totalRefunds, shop } = fetcher.data;
      setProducts(products || []);
      setOrders(orders || []);
      setTotalSales(totalSales || 0);
      setTotalRefunds(totalRefunds || 0);
      setShop(shop || "");
      setLoading(false);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (productId) {
      fetchProductData(productId);
    }
  }, [productId]);

  const handleProductChange = (value: string) => {
    setProductId(value);
    const selectedProduct = products.find((product) => product.value === value);
    setSelectedProductName(selectedProduct ? selectedProduct.label : "");
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleDateChange = (field: string) => (value: string) => {
    if (field === "startDate") setStartDate(value);
    if (field === "endDate") setEndDate(value);
  };

  const chartData = {
    labels: orders.map((order: any) =>
      new Date(order.node.createdAt).toLocaleDateString(),
    ),
    totalSales: orders.map((order: any) =>
      parseFloat(order.node.totalPriceSet?.shopMoney?.amount || 0),
    ),
    totalRefunds: orders.map((order: any) =>
      order.node.refunds.reduce(
        (acc: number, refund: any) =>
          acc +
          refund.refundLineItems.edges.reduce(
            (subAcc: number, item: any) =>
              subAcc +
              parseFloat(
                item.node.lineItem.originalUnitPriceSet.shopMoney.amount || 0,
              ),
            0,
          ),
        0,
      ),
    ),
  };

  const filteredOrders = orders.filter((order) => {
    return order.node.refunds.some((refund) =>
      refund.note?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  });

  const rows = filteredOrders.flatMap((order: any, index: number) => {
    const refundDetails = order.node.refunds.flatMap((refund: any) => {
      return refund.refundLineItems.edges.map((item: any) => {
        const refundAmount = parseFloat(
          item.node.lineItem.originalUnitPriceSet.shopMoney.amount || 0,
        );
        return {
          orderId: order.node.id,
          orderName: order.node.name,
          createdAt: new Date(order.node.createdAt).toLocaleString(),
          refundedProducts: (
            <a
              href={`https://${shop}/admin/products/${item.node.lineItem.product.id.split("/").pop()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {`${item.node.lineItem.title} (x${item.node.lineItem.quantity})`}
            </a>
          ),
          subtotalPrice: `${order.node.subtotalPriceSet?.shopMoney?.amount || 0} ${order.node.subtotalPriceSet?.shopMoney?.currencyCode || ""}`,
          shippingPrice: `${order.node.totalShippingPriceSet?.shopMoney?.amount || 0} ${order.node.totalShippingPriceSet?.shopMoney?.currencyCode || ""}`,
          totalPrice: `${order.node.totalPriceSet?.shopMoney?.amount || 0} ${order.node.totalPriceSet?.shopMoney?.currencyCode || ""}`,
          refundStatus: "Yes",
          refundAmount:
            refundAmount > 0
              ? `${refundAmount.toFixed(2)} ${order.node.totalPriceSet?.shopMoney?.currencyCode || ""}`
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
          orderId: order.node.id,
          createdAt: new Date(order.node.createdAt).toLocaleString(),
          refundedProducts: "N/A",
          subtotalPrice: `${order.node.subtotalPriceSet?.shopMoney?.amount || 0} ${order.node.subtotalPriceSet?.shopMoney?.currencyCode || ""}`,
          shippingPrice: `${order.node.totalShippingPriceSet?.shopMoney?.amount || 0} ${order.node.totalShippingPriceSet?.shopMoney?.currencyCode || ""}`,
          totalPrice: `${order.node.totalPriceSet?.shopMoney?.amount || 0} ${order.node.totalPriceSet?.shopMoney?.currencyCode || ""}`,
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

  // Extract the store identifier from the shop domain
  const storeIdentifier = shop.replace(".myshopify.com", "");

  const rowsForTable = rows.map((row, index) => [
    <a
      href={`https://admin.shopify.com/store/${storeIdentifier}/orders/${row.orderId.split("/").pop()}`}
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
      {row.customerName !== "N/A" && row.customerName && (
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

  return (
    <Page fullWidth>
      <ui-title-bar title="Refund Dashboard by Product" />

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading...</div>
        </div>
      )}
      <Layout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
          }}
        >
          <Card sectioned>
            <Select
              label="Select Product"
              options={products}
              onChange={(value) => {
                handleProductChange(value);
              }}
              value={productId}
              placeholder="Choose a product"
            />
          </Card>

          {productId && !loading && (
            <div>
              <Card sectioned>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    justifyContent: "center",
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
                  <Button primary onClick={() => fetchProductData(productId)}>
                    Apply
                  </Button>
                </div>
              </Card>

              <Layout.Section>
                {/* Top Total Sales */}
                <div>
                  <Card sectioned>
                    <Text variant="headingLg">
                      Total Sales: ${totalSales.toFixed(2)} -{" "}
                      {selectedProductName}
                    </Text>
                  </Card>
                </div>
                {/* Gauge and Chart Components */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginTop: "10px",
                  }}
                >
                  {/* Gauge component */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignContent: "center",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div>
                      {/* Total Refund Guage component */}
                      <Card sectioned>
                        <div
                          style={{ display: "flex-row", textAlign: "center" }}
                        >
                          <RefundGauge
                            totalSales={totalSales}
                            totalRefunds={totalRefunds}
                          />
                          <Text variant="headingMd">Total Refunds:</Text>
                          <Text variant="headingXl">
                            {totalRefunds.toFixed(2)}
                          </Text>
                          <p></p>
                        </div>
                      </Card>
                    </div>
                    {/* Total Sale Guage component */}
                    <div>
                      <Card sectioned>
                        <div
                          style={{ display: "flex-row", textAlign: "center" }}
                        >
                          <RefundGauge
                            totalSales={totalSales}
                            totalRefunds={totalSales - totalRefunds}
                            label="Profit %"
                            isSalesGauge
                          />
                          <Text variant="headingMd">Net Profit: </Text>
                          <Text variant="headingXl">
                            {parseFloat((totalSales - totalRefunds).toFixed(2))}
                          </Text>
                        </div>
                      </Card>
                    </div>
                  </div>
                  {/* Chart Component */}
                  <Card>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <LineChart data={chartData} />
                    </div>
                  </Card>
                </div>
              </Layout.Section>

              <Layout.Section>
                <Card sectioned>
                  {/* Search Bar */}
                  <TextField
                    label="Search Refund Notes"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by refund notes"
                  />
                </Card>
                <Card sectioned>
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
                    rows={rowsForTable}
                  />
                </Card>
              </Layout.Section>
            </div>
          )}
        </div>
      </Layout>
    </Page>
  );
};

export default ProductDetails;
