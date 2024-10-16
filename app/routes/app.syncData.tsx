import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  ProgressBar,
  Banner,
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { ActionFunction, LoaderFunction, json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "~/shopify.server";
import { useEffect, useState } from "react";

// Define types for PollingData and FetcherData
type PollingData = {
  status: string;
  url?: string;
};
type FetcherData = PollingData | undefined;

// Variables to track progress
let totalRecords = 0;
let processedRecords = 0;

// Function to check the status of the bulk operation
const checkBulkOperationStatus = async (admin, bulkOperationId) => {
  try {
    const response = await admin.graphql(`
      query {
        node(id: "${bulkOperationId}") {
          ... on BulkOperation {
            id
            status
            url
            errorCode
            objectCount
            fileSize
            partialDataUrl
          }
        }
      }
    `);

    const data = await response.json();
    console.log("Bulk Operation Status:", data);

    return data.data.node;
  } catch (error) {
    console.error("Error checking bulk operation status:", error);
    return null;
  }
};

// Function to initiate the bulk operation
const initiateBulkOperation = async (admin) => {
  try {
    const response = await admin.graphql(`
      mutation {
        bulkOperationRunQuery(
          query: """
          {
            orders {
              edges {
                node {
                  id
                  name
                  email
                  createdAt
                  updatedAt
                  lineItems {
                    edges {
                      node {
                        id
                        name
                        title
                        image {
                          url
                        }
                        product {
                          id
                          title
                        }
                      }
                    }
                  }
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  customer {
                    id
                    firstName
                    lastName
                    email
                  }
                }
              }
            }
          }
          """
        ) {
          bulkOperation {
            id
            status
            url
          }
          userErrors {
            field
            message
          }
        }
      }
    `);
    const data = await response.json();

    if (
      response.ok &&
      !data.errors &&
      data.data.bulkOperationRunQuery.bulkOperation
    ) {
      return {
        success: true,
        bulkOperation: data.data.bulkOperationRunQuery.bulkOperation,
      };
    } else {
      console.error("Bulk operation initiation failed:", data.errors);
      return { success: false, error: data.errors };
    }
  } catch (error) {
    console.error("Bulk operation initiation failed:", error);
    return { success: false, error };
  }
};

let isFirstLog = true;

// Function to fetch refunds for each order
const fetchOrderRefunds = async (admin, orderId: string) => {
  try {
    const response = await admin.graphql(
      `
      query fetchOrderRefunds($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          refunds {
            id
            createdAt
            note
            totalRefundedSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            refundLineItems(first: 100) {
              edges {
                node {
                  lineItem {
                    id
                    name
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                  }
                  quantity
                  restockType
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
      {
        variables: { orderId },
      }
    );

    const rawResponse = await response.text();

    // Log only the first response for debugging, and stop logging after that
    if (isFirstLog) {
      console.log("Raw GraphQL Response:", rawResponse);
      isFirstLog = false;
    }

    if (response.ok) {
      const data = JSON.parse(rawResponse);
      return data.data.order.refunds;
    } else {
      console.error(`Failed to fetch refunds for order ${orderId}`);
      return null;
    }
  } catch (error) {
    console.error("An error occurred during the GraphQL query:", error);
    return null;
  }
};

// Action function that initiates the bulk operation, polls for its completion, processes the data, and upserts refunds
export const action: ActionFunction = async ({ request }) => {
  const prisma = new PrismaClient();
  try {
    // Step 1: Authenticate the user
    const { admin, session } = await authenticate.admin(request);

    // Step 2: Initiate the bulk operation
    const { success, bulkOperation, error } =
      await initiateBulkOperation(admin);

    if (!success) {
      console.error("Bulk operation initiation failed:", error);
      return json({ status: "ERROR", error }, { status: 500 });
    }

    // Step 3: Poll for bulk operation completion
    let operationStatus = bulkOperation.status;
    let bulkDataUrl = null;

    while (operationStatus !== "COMPLETED") {
      // Wait for 5 seconds before checking the status again
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const statusCheck = await checkBulkOperationStatus(
        admin,
        bulkOperation.id
      );
      operationStatus = statusCheck.status;

      if (operationStatus === "COMPLETED") {
        bulkDataUrl = statusCheck.url; // URL to fetch the result data
        break;
      } else if (operationStatus === "FAILED") {
        console.error("Bulk operation failed");
        return json(
          { status: "ERROR", error: "Bulk operation failed" },
          { status: 500 }
        );
      }
    }

    if (!bulkDataUrl) {
      console.error("No URL found for bulk data after completion.");
      return json(
        { status: "ERROR", error: "No URL for bulk data" },
        { status: 500 }
      );
    }

    // Step 4: Fetch the bulk operation result data from the returned URL
    const bulkDataResponse = await fetch(bulkDataUrl);
    const bulkDataText = await bulkDataResponse.text();
    const lines = bulkDataText.split("\n").filter((line) => line.trim() !== "");

    // Set totalRecords after fetching bulk data
    totalRecords = lines.length;
    processedRecords = 0; // Reset processedRecords when starting

    console.log("Number of lines to process:", lines.length);


    // Step 5: Process each line and perform database operations
    for (const line of lines) {

      try {
        const item = JSON.parse(line);

        console.log(
          `Processing record ${Math.min(processedRecords + 1, totalRecords)} of ${totalRecords}`
        );

        // Check if this is an Order or a Line Item
        if (item.id.startsWith("gid://shopify/Order")) {
          // Process Order
          const orderId = item.id;
          const totalPriceAmount = item?.totalPriceSet?.shopMoney?.amount || 0;
          const currencyCode =
            item?.totalPriceSet?.shopMoney?.currencyCode || "USD";

          // Upsert the basic order data
          const upsertedOrder = await prisma.order.upsert({
            where: { id: orderId },
            create: {
              id: orderId,
              shop: session.shop,
              name: item.name,
              email: item.email || null,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              totalPrice: parseFloat(totalPriceAmount),
              currencyCode: currencyCode,
              customerId: item.customer?.id || null,
              customerFirstName: item.customer?.firstName || null,
              customerLastName: item.customer?.lastName || null,
            },
            update: {
              name: item.name,
              email: item.email || null,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              totalPrice: parseFloat(totalPriceAmount),
              currencyCode: currencyCode,
              customerId: item.customer?.id || null,
              customerFirstName: item.customer?.firstName || null,
              customerLastName: item.customer?.lastName || null,
            },
          });

          // Fetch and upsert refunds for each order
          const refunds = await fetchOrderRefunds(admin, upsertedOrder.id);

          if (refunds) {
            for (const refund of refunds) {
              const refundAmount =
                refund?.totalRefundedSet?.shopMoney?.amount || 0;
              const refundCurrency =
                refund?.totalRefundedSet?.shopMoney?.currencyCode || "USD";

              await prisma.refund.upsert({
                where: { id: refund.id },
                create: {
                  id: refund.id,
                  orderId: upsertedOrder.id,
                  note: refund.note,
                  createdAt: new Date(refund.createdAt),
                  currencyCode: refundCurrency,
                  amount: parseFloat(refundAmount),
                },
                update: {
                  note: refund.note,
                  createdAt: new Date(refund.createdAt),
                  amount: parseFloat(refundAmount),
                  currencyCode: refundCurrency,
                },
              });

              // Upsert refund line items for each refund
              for (const lineItemEdge of refund.refundLineItems.edges) {
                const lineItem = lineItemEdge.node;

                await prisma.refundLineItem.upsert({
                  where: { id: lineItem.lineItem.id },
                  create: {
                    id: lineItem.lineItem.id,
                    refundId: refund.id,
                    lineItemId: lineItem.lineItem.id,
                    title: lineItem.lineItem.name,
                    quantity: lineItem.quantity,
                    orderName: upsertedOrder.name, // Save the Order name
                  },
                  update: {
                    title: lineItem.lineItem.name,
                    quantity: lineItem.quantity,
                    orderName: upsertedOrder.name, // Update the Order name
                  },
                });
              }
            }
          }
        }

        // Insert Data in Products Model
        if (item.id.startsWith("gid://shopify/LineItem")) {
          const productData = item.product;
          const orderId = item.__parentId;

          // Ensure that the Order exists before inserting/upserting line items
          const existingOrder = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (!existingOrder) {
            console.error(`Order with id ${orderId} does not exist`);
            continue; // Skip processing this line item if the order does not exist
          }

          // Upsert the product if it exists
          if (productData) {
            const upsertedProduct = await prisma.product.upsert({
              where: { id: productData.id },
              create: {
                id: productData.id,
                title: productData.title,
                images: productData.images?.edges.map((img) => img.node.originalSrc) || [],
              },
              update: {
                title: productData.title,
                images: productData.images?.edges.map((img) => img.node.originalSrc) || [],
              },
            });

            // Now upsert the line item with the product relationship
            await prisma.orderLineItem.upsert({
              where: { id: item.id },
              create: {
                id: item.id,
                orderId: orderId, // Ensure this is linked to an existing order
                name: item.name,
                title: item.title,
                productId: upsertedProduct.id,
                imageUrl: item.image?.url || null,
              },
              update: {
                name: item.name,
                title: item.title,
                productId: upsertedProduct.id,
                imageUrl: item.image?.url || null,
              },
            });
          }
        }

        processedRecords = Math.min(processedRecords + 1, totalRecords);

          // Log progress at intervals
    if (processedRecords % 10 === 0 || processedRecords === totalRecords) {
      console.log(`Processed ${processedRecords} out of ${totalRecords}`);
    }
       

      // Check if processing is complete
      if (processedRecords >= totalRecords) {
        console.log("Processing completed.");
        break; // Exit loop when processing is done
      }
      } catch (error) {
        console.error(`Failed to process line: ${line}`, error);
      }
    }

    // Return progress information
    return json({
      status: "COMPLETED",
      totalRecords,
      processedRecords
    });
    
  } catch (error) {
    console.error("Error in action function:", error);
    return json({ status: "ERROR", error }, { status: 500 });
  } finally {
    // Always disconnect Prisma at the end
    await prisma.$disconnect();
  }
};

// Loader function to fetch the current bulk operation status
export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Query the current bulk operation status
  const responseBulk = await admin.graphql(`
    query {
      currentBulkOperation {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  `);

  const data = await responseBulk.json();

  // Log the bulk operation status to check if it's running or completed
  if (responseBulk.ok && data.data.currentBulkOperation) {
    // Return the bulk operation status along with progress data
    return json({
      bulkOperationStatus: data.data.currentBulkOperation,
      totalRecords, // Total number of records to be processed
      processedRecords, // Number of records processed so far
    });
  } else {
    return json(null, { status: 500 });
  }
};

// Define the type for the data returned by the loader
type ProgressData = {
  totalRecords: number;
  processedRecords: number;
};

const DataSync = () => {
  const fetcher = useFetcher<ProgressData>(); // Explicitly type the fetcher data
  const [totalRecords, setTotalRecords] = useState(0);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Polling for progress
  useEffect(() => {
    if (isExporting) {
      const interval = setInterval(() => {
        fetcher.load("/app/syncData"); // Call the loader function to fetch progress
      }, 12000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isExporting, fetcher]);

  // Update progress bar and data from backend
  useEffect(() => {
    if (fetcher.data) {
      const { totalRecords = 0, processedRecords = 0, status } = fetcher.data;
  
      setTotalRecords(totalRecords);
      setProcessedRecords(processedRecords);
  
      // Stop polling if the sync is completed
      if (status === "COMPLETED" || processedRecords >= totalRecords) {
        setIsExporting(false);
        // Optionally clear the interval if you're using one
      }
    }
  }, [fetcher.data]);
  
  const startSync = async () => {
    // Prevent multiple sync clicks
    if (isExporting) return;
  
    setIsExporting(true);
    setErrorMessage(""); // Clear any previous errors
  
    try {
       fetcher.submit(null, { method: "post", action: "/app/syncData" });
    } catch (error) {
      console.error("Sync Error:", error);
      setErrorMessage("Failed to start sync. Please try again later.");
      setIsExporting(false); // Re-enable the button only if there was an error
    }
  };
  

  const progressPercentage = totalRecords
    ? Math.min((processedRecords / totalRecords) * 100, 100)
    : 0;

  return (
    <Page>
      <Layout>
        {errorMessage && <Banner title={errorMessage} tone="critical" />}
        <Layout.Section>
          <Card>
            <Text as="h4" variant="headingMd">
              Data Sync
            </Text>
            <br />
            <Button onClick={startSync} disabled={isExporting}>
              {isExporting ? "Data Syncing..." : "Start Data Sync"}
            </Button>
          </Card>
        </Layout.Section>

        {isExporting && (
          <Layout.Section>
            <Banner title="Data Sync in Progress">
              <ProgressBar progress={progressPercentage} />
              <p>
                {Math.min(processedRecords, totalRecords)} of {totalRecords}{" "}
                records processed
              </p>
            </Banner>
          </Layout.Section>
        )}

        {!isExporting &&
          processedRecords > 0 &&
          processedRecords >= totalRecords && (
            <Layout.Section>
              <Banner title="Data Sync Complete" tone="success">
                <p>
                  {processedRecords} of {totalRecords} records inserted
                  successfully.
                </p>
              </Banner>
            </Layout.Section>
          )}
      </Layout>
    </Page>
  );
};

export default DataSync;
