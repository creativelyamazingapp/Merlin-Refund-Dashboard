import type { LoaderFunction } from "@remix-run/node";
import { Card, Layout, Page } from "@shopify/polaris";
import { json } from "@remix-run/node";
import { apiVersion, authenticate } from "~/shopify.server";
import { useLoaderData } from "@remix-run/react";
import RefundGauge from "../component/refund-gauge"; // Adjust the import path as needed

const ordersQuery = `
  {
    orders(first: 10) {
      edges {
        node {
          id
          name
          email
          createdAt
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
          }
          refunds {
            id
          }
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

export const loader: LoaderFunction = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop, accessToken } = session;

  try {
    const response = await fetch(
      `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/graphql",
          "X-Shopify-Access-Token": accessToken!,
        },
        body: ordersQuery,
      },
    );

    if (response.ok) {
      const data = await response.json();

      if (data.errors) {
        console.log("GraphQL Errors:", data.errors);
        return json({ errors: data.errors }, { status: 400 });
      }

      const orders = data.data.orders.edges;

      // Fetch refund details for each order
      for (const order of orders) {
        for (const refund of order.node.refunds) {
          const refundDetails = await fetchRefundDetails(admin, refund.id);
          refund.details = refundDetails;
        }
      }

      // Extract the store identifier from the shop domain
      const storeIdentifier = shop.replace(".myshopify.com", "");

      return json({ orders, storeIdentifier });
    } else {
      console.log("Failed to fetch orders. Status:", response.status);
      return json(
        { error: "Failed to fetch orders" },
        { status: response.status },
      );
    }
  } catch (err) {
    console.error("Error fetching orders:", err);
    return json({ error: "Error fetching orders" }, { status: 500 });
  }
};

const RefundDashboard = () => {
  const { orders, storeIdentifier } = useLoaderData<{
    orders: any;
    storeIdentifier: string;
  }>();

  if (orders.errors) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <h1>Error fetching orders</h1>
              <pre>{JSON.stringify(orders.errors, null, 2)}</pre>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const getOrderID = (gid: string) => {
    const parts = gid.split("/");
    return parts[parts.length - 1];
  };

  let totalSales = 0;
  let totalRefunds = 0;

  orders.forEach((order: any) => {
    totalSales += parseFloat(order.node.totalPriceSet.shopMoney.amount);
    order.node.refunds.forEach((refund: any) => {
      totalRefunds += parseFloat(refund.details.amount);
    });
  });

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <h1>Orders</h1>
            <RefundGauge totalSales={totalSales} totalRefunds={totalRefunds} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Order ID
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Customer Name
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Email
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Created At
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Subtotal Price
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Shipping Price
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Total Price
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Refund Status
                  </th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                    Refund Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr key={order.node.id}>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      <a
                        href={`https://admin.shopify.com/store/${storeIdentifier}/orders/${getOrderID(order.node.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {getOrderID(order.node.name)}
                      </a>
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.customer
                        ? `${order.node.customer.firstName} ${order.node.customer.lastName}`
                        : "N/A"}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.email}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {new Date(order.node.createdAt).toLocaleString()}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.subtotalPriceSet.shopMoney.amount}{" "}
                      {order.node.subtotalPriceSet.shopMoney.currencyCode}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.totalShippingPriceSet.shopMoney.amount}{" "}
                      {order.node.totalShippingPriceSet.shopMoney.currencyCode}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.totalPriceSet.shopMoney.amount}{" "}
                      {order.node.totalPriceSet.shopMoney.currencyCode}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.refunds.length > 0 ? "Yes" : "No"}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                      {order.node.refunds.length > 0
                        ? `${order.node.refunds[0].details.amount} ${order.node.refunds[0].details.currencyCode}`
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default RefundDashboard;
