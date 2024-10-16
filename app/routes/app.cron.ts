// // import { PrismaClient } from "@prisma/client";
// // import { ActionFunction, json, LoaderFunction } from "@remix-run/node";
// // import { authenticate } from "~/shopify.server";
// // import prisma from "~/db.server";
// // import cron from 'node-cron';



// //   // Function to check the status of the bulk operation
// // const checkBulkOperationStatus = async (admin, bulkOperationId) => {
// //     try {
// //       const response = await admin.graphql(`
// //         query {
// //           node(id: "${bulkOperationId}") {
// //             ... on BulkOperation {
// //               id
// //               status
// //               url
// //               errorCode
// //               objectCount
// //               fileSize
// //             }
// //           }
// //         }
// //       `);
  
// //       const data = await response.json();
// //       console.log("Bulk Operation Status:", data);
  
// //       return data.data.node;
// //     } catch (error) {
// //       console.error("Error checking bulk operation status:", error);
// //       return null;
// //     }
// //   };
  
// //   // Function to initiate the bulk operation
// //   const initiateBulkOperation = async (admin) => {
// //     try {
// //       const response = await admin.graphql(`
// //         mutation {
// //           bulkOperationRunQuery(
// //             query: """
// //             {
// //               orders {
// //                 edges {
// //                   node {
// //                     id
// //                     name
// //                     email
// //                     createdAt
// //                     updatedAt
// //                     shippingLines {
// //                       edges {
// //                         node {
// //                           phone
// //                         }
// //                       }
// //                     }
// //                     lineItems {
// //                       edges {
// //                         node {
// //                           id
// //                           name
// //                           title
// //                           quantity
// //                           image {
// //                             url
// //                           }
// //                         }
// //                       }
// //                     }
// //                     totalPriceSet {
// //                       shopMoney {
// //                         amount
// //                         currencyCode
// //                       }
// //                     }
// //                     customer {
// //                       id
// //                       firstName
// //                       lastName
// //                       email
// //                       phone
// //                       defaultAddress {
// //                         address1
// //                         address2
// //                         city
// //                         province
// //                         country
// //                         zip
// //                       }
// //                     }
// //                   }
// //                 }
// //               }
// //             }
// //             """
// //           ) {
// //             bulkOperation {
// //               id
// //               status
// //               url
// //             }
// //             userErrors {
// //               field
// //               message
// //             }
// //           }
// //         }
// //       `);
  
// //       const data = await response.json();
  
// //       if (
// //         response.ok &&
// //         !data.errors &&
// //         data.data.bulkOperationRunQuery.bulkOperation
// //       ) {
// //         return {
// //           success: true,
// //           bulkOperation: data.data.bulkOperationRunQuery.bulkOperation,
// //         };
// //       } else {
// //         console.error("Bulk operation initiation failed:", data.errors);
// //         return { success: false, error: data.errors };
// //       }
// //     } catch (error) {
// //       console.error("Bulk operation initiation failed:", error);
// //       return { success: false, error };
// //     }
// //   };


// // // Function to fetch refunds for each order
// // const fetchOrderRefunds = async (admin, orderId: string) => {
// //   try {
// //     const response = await admin.graphql(
// //       `
// //       query fetchOrderRefunds($orderId: ID!) {
// //         order(id: $orderId) {
// //           id
// //           name
// //           refunds {
// //             id
// //             createdAt
// //             note
// //             totalRefundedSet {
// //               shopMoney {
// //                 amount
// //                 currencyCode
// //               }
// //             }
// //             refundLineItems(first: 100) {
// //               edges {
// //                 node {
// //                   lineItem {
// //                     id
// //                     name
// //                     quantity
// //                     originalUnitPriceSet {
// //                       shopMoney {
// //                         amount
// //                         currencyCode
// //                       }
// //                     }
// //                   }
// //                   quantity
// //                   restockType
// //                   location {
// //                     id
// //                     name
// //                   }
// //                 }
// //               }
// //             }
// //           }
// //         }
// //       }`,
// //       {
// //         variables: { orderId },
// //       },
// //     );

// //     const rawResponse = await response.text();
// //     console.log("Raw GraphQL Response:", rawResponse);

// //     if (response.ok) {
// //       const data = JSON.parse(rawResponse);
// //       return data.data.order.refunds;
// //     } else {
// //       console.error(`Failed to fetch refunds for order ${orderId}`);
// //       return null;
// //     }
// //   } catch (error) {
// //     console.error("An error occurred during the GraphQL query:", error);
// //     return null;
// //   }
// // };

// // // Step 3: Define the action function to initiate the bulk operation
// // export const action: ActionFunction = async ({ request }) => {
// //   const { admin, session } = await authenticate.admin(request);

// //   const { success, bulkOperation, error } = await initiateBulkOperation(admin);

// //   if (success) {
// //     return json({ status: "RUNNING", bulkOperation });
// //   } else {
// //     return json({ status: "ERROR", error }, { status: 500 });
// //   }
// // };

// // // Step 4: Process bulk operation results and fetch refunds
// // export const loader: LoaderFunction = async ({ request }) => {
// //   const { admin } = await authenticate.admin(request);
// //   const prisma = new PrismaClient();
// //   const accessToken = request.headers.get("X-Shopify-Access-Token");
// //   console.log("accessToken", accessToken)
// //   const expectedToken = 'shpua_dc66acac1c2304887c949a51868a43de'; // Store your access token securely


  
// //   // Query the current bulk operation status
// //   const responseBulk = await admin.graphql(`
// //     query {
// //       currentBulkOperation {
// //         id
// //         status
// //         errorCode
// //         createdAt
// //         completedAt
// //         objectCount
// //         fileSize
// //         url
// //         partialDataUrl
// //       }
// //     }
// //   `);

// //   const data = await responseBulk.json();

// //   // Log the bulk operation status to check if it's running or completed
// //   console.log("Current Bulk Operation Status:", data);

// //   if (responseBulk.ok && data.data.currentBulkOperation) {

// //     try {
// //       // Step 1: Authenticate the user
// //       const { admin, session } = await authenticate.admin(request);
  
// //       // Step 2: Initiate the bulk operation
// //       const { success, bulkOperation, error } =
// //         await initiateBulkOperation(admin);
  
// //       if (!success) {
// //         console.error("Bulk operation initiation failed:", error);
// //         return json({ status: "ERROR", error }, { status: 500 });
// //       }
  
// //       // Step 3: Poll for bulk operation completion
// //       let operationStatus = bulkOperation.status;
// //       let bulkDataUrl = null;
  
// //       while (operationStatus !== "COMPLETED") {
// //         // Wait for 5 seconds before checking the status again
// //         await new Promise((resolve) => setTimeout(resolve, 5000));
  
// //         const statusCheck = await checkBulkOperationStatus(
// //           admin,
// //           bulkOperation.id,
// //         );
// //         operationStatus = statusCheck.status;
  
// //         if (operationStatus === "COMPLETED") {
// //           bulkDataUrl = statusCheck.url; // URL to fetch the result data
// //           break;
// //         } else if (operationStatus === "FAILED") {
// //           console.error("Bulk operation failed");
// //           return json(
// //             { status: "ERROR", error: "Bulk operation failed" },
// //             { status: 500 },
// //           );
// //         }
// //       }
  
// //       if (!bulkDataUrl) {
// //         console.error("No URL found for bulk data after completion.");
// //         return json(
// //           { status: "ERROR", error: "No URL for bulk data" },
// //           { status: 500 },
// //         );
// //       }
  
// //       // Step 4: Fetch the bulk operation result data from the returned URL
// //       const bulkDataResponse = await fetch(bulkDataUrl);
// //       const bulkDataText = await bulkDataResponse.text();
// //       const lines = bulkDataText.split("\n").filter((line) => line.trim() !== "");
  
// //       // Step 5: Process each line and perform database operations
// //       for (const line of lines) {
// //         try {
// //           const item = JSON.parse(line);
  
// //           // Check if this is an Order or a Line Item
// //           if (item.id.startsWith("gid://shopify/Order")) {
// //             // Process Order
// //             const orderId = item.id;
// //             const totalPriceAmount = item?.totalPriceSet?.shopMoney?.amount || 0;
// //             const currencyCode =
// //               item?.totalPriceSet?.shopMoney?.currencyCode || "USD";
  
// //             // Upsert the basic order data
// //             const upsertedOrder = await prisma.order.upsert({
// //               where: { id: orderId },
// //               create: {
// //                 id: orderId,
// //                 shop: session.shop,
// //                 name: item.name,
// //                 email: item.email || null,
// //                 createdAt: new Date(item.createdAt),
// //                 updatedAt: new Date(item.updatedAt),
// //                 totalPrice: parseFloat(totalPriceAmount),
// //                 currencyCode: currencyCode,
// //                 customerId: item.customer?.id || null,
// //                 customerFirstName: item.customer?.firstName || null,
// //                 customerLastName: item.customer?.lastName || null,
// //                 address1: item.customer?.defaultAddress?.address1 || null,
// //                 address2: item.customer?.defaultAddress?.address2 || null,
// //                 city: item.customer?.defaultAddress?.city || null,
// //                 province: item.customer?.defaultAddress?.province || null, 
// //                 country: item.customer?.defaultAddress?.country || null,
// //                 zip: item.customer?.defaultAddress?.zip || null,
// //                 phone: item.customer?.phone || item.phone || null,
// //               },
// //               update: {
// //                 name: item.name,
// //                 email: item.email || null,
// //                 createdAt: new Date(item.createdAt),
// //                 updatedAt: new Date(item.updatedAt),
// //                 totalPrice: parseFloat(totalPriceAmount),
// //                 currencyCode: currencyCode,
// //                 customerId: item.customer?.id || null,
// //                 customerFirstName: item.customer?.firstName || null,
// //                 customerLastName: item.customer?.lastName || null,
// //                 address1: item.customer?.defaultAddress?.address1 || null,
// //                 address2: item.customer?.defaultAddress?.address2 || null,
// //                 city: item.customer?.defaultAddress?.city || null,
// //                 province: item.customer?.defaultAddress?.province || null, 
// //                 country: item.customer?.defaultAddress?.country || null,
// //                 zip: item.customer?.defaultAddress?.zip || null,
// //                 phone: item.customer?.phone || item.phone || null,
// //               },
// //             });
  
// //             // Fetch and upsert refunds for each order
// //             const refunds = await fetchOrderRefunds(admin, upsertedOrder.id);
// //             console.log("Refunds for Order ID:", upsertedOrder.id, refunds);
  
// //             if (refunds) {
// //               for (const refund of refunds) {
// //                 const refundAmount =
// //                   refund?.totalRefundedSet?.shopMoney?.amount || 0;
// //                 const refundCurrency =
// //                   refund?.totalRefundedSet?.shopMoney?.currencyCode || "USD";
  
// //                 await prisma.refund.upsert({
// //                   where: { id: refund.id },
// //                   create: {
// //                     id: refund.id,
// //                     orderId: upsertedOrder.id,
// //                     note: refund.note,
// //                     createdAt: new Date(refund.createdAt),
// //                     currencyCode: refundCurrency,
// //                     amount: parseFloat(refundAmount),
// //                   },
// //                   update: {
// //                     note: refund.note,
// //                     createdAt: new Date(refund.createdAt),
// //                     amount: parseFloat(refundAmount),
// //                     currencyCode: refundCurrency,
// //                   },
// //                 });
  
// //                 // Upsert refund line items for each refund
// //                 for (const lineItemEdge of refund.refundLineItems.edges) {
// //                   const lineItem = lineItemEdge.node;
// //                   const originalUnitPrice =
// //                     lineItem?.originalUnitPriceSet?.shopMoney?.amount || 0;
// //                   const lineItemCurrency =
// //                     lineItem?.originalUnitPriceSet?.shopMoney?.currencyCode ||
// //                     "USD";
  
// //                   await prisma.refundLineItem.upsert({
// //                     where: { id: lineItem.lineItem.id },
// //                     create: {
// //                       id: lineItem.lineItem.id,
// //                       refundId: refund.id,
// //                       lineItemId: lineItem.lineItem.id,
// //                       title: lineItem.lineItem.name,
// //                       quantity: lineItem.quantity,
// //                       orderName: upsertedOrder.name, // Save the Order name
// //                     },
// //                     update: {
// //                       title: lineItem.lineItem.name,
// //                       quantity: lineItem.quantity,
// //                       orderName: upsertedOrder.name, // Update the Order name
// //                     },
// //                   });
// //                 }
// //               }
// //             }
// //           } else if (item.id.startsWith("gid://shopify/LineItem")) {
// //             // Process Line Item (use __parentId to link with the order)
// //             const orderId = item.__parentId;
// //             const lineItemId = item.id;
  
// //             // Upsert the line item data
// //             await prisma.orderLineItem.upsert({
// //               where: { id: lineItemId },
// //               create: {
// //                 id: lineItemId,
// //                 orderId: orderId, // Link this line item to its order
// //                 name: item.name,
// //                 title: item.title,
// //                 productId: item.productId,
// //                 imageUrl: item.image?.url || null,
// //               },
// //               update: {
// //                 name: item.name,
// //                 title: item.title,
// //                 productId: item.productId,
// //                 imageUrl: item.image?.url || null,
// //               },
// //             });
// //           }
// //         } catch (error) {
// //           console.error(`Failed to process line: ${line}`, error);
// //         }
// //       }
  
// //       return json({ status: "COMPLETED" });
// //     } catch (error) {
// //       console.error("Error in action function:", error);
// //       return json({ status: "ERROR", error }, { status: 500 });
// //     }

   
// //   } 

// //   return json(data.data.currentBulkOperation);

// // };

// import { ApiVersion, GraphqlClient } from '@shopify/shopify-api';  // Correct import for GraphQL Client
// import { Session } from '@shopify/shopify-api';
// import Shopify from '@shopify/shopify-api';


// import { PrismaClient } from "@prisma/client";
// import { authenticate } from "~/shopify.server";
// import cron from 'node-cron';
// import fetch from 'node-fetch'; // Ensure you're using this for making HTTP requests to get bulk operation data

// const prisma = new PrismaClient();

// // Function to check the status of the bulk operation
// const checkBulkOperationStatus = async (admin, bulkOperationId) => {
//     try {
//         const response = await admin.graphql(`
//             query {
//                 node(id: "${bulkOperationId}") {
//                     ... on BulkOperation {
//                         id
//                         status
//                         url
//                         errorCode
//                         objectCount
//                         fileSize
//                     }
//                 }
//             }
//         `);

//         const data = await response.json();
//         console.log("Bulk Operation Status:", data);

//         return data.data.node;
//     } catch (error) {
//         console.error("Error checking bulk operation status:", error);
//         return null;
//     }
// };

// // Function to initiate the bulk operation
// const initiateBulkOperation = async (admin) => {
//     try {
//         const response = await admin.graphql(`
//             mutation {
//                 bulkOperationRunQuery(
//                     query: """
//                     {
//                         orders {
//                             edges {
//                                 node {
//                                     id
//                                     name
//                                     email
//                                     createdAt
//                                     updatedAt
//                                     shippingLines {
//                                         edges {
//                                             node {
//                                                 phone
//                                             }
//                                         }
//                                     }
//                                     lineItems {
//                                         edges {
//                                             node {
//                                                 id
//                                                 name
//                                                 title
//                                                 quantity
//                                                 image {
//                                                     url
//                                                 }
//                                             }
//                                         }
//                                     }
//                                     totalPriceSet {
//                                         shopMoney {
//                                             amount
//                                             currencyCode
//                                         }
//                                     }
//                                     customer {
//                                         id
//                                         firstName
//                                         lastName
//                                         email
//                                         phone
//                                         defaultAddress {
//                                             address1
//                                             address2
//                                             city
//                                             province
//                                             country
//                                             zip
//                                         }
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                     """
//                 ) {
//                     bulkOperation {
//                         id
//                         status
//                         url
//                     }
//                     userErrors {
//                         field
//                         message
//                     }
//                 }
//             }
//         `);

//         const data = await response.json();

//         if (response.ok && !data.errors && data.data.bulkOperationRunQuery.bulkOperation) {
//             return {
//                 success: true,
//                 bulkOperation: data.data.bulkOperationRunQuery.bulkOperation,
//             };
//         } else {
//             console.error("Bulk operation initiation failed:", data.errors);
//             return { success: false, error: data.errors };
//         }
//     } catch (error) {
//         console.error("Bulk operation initiation failed:", error);
//         return { success: false, error };
//     }
// };

// // Function to upsert order data into PostgreSQL
// const upsertOrderData = async (bulkDataText, shop) => {
//     const lines = bulkDataText.split("\n").filter((line) => line.trim() !== "");

//     for (const line of lines) {
//         try {
//             const item = JSON.parse(line);

//             if (item.id.startsWith("gid://shopify/Order")) {
//                 const orderId = item.id;
//                 const totalPriceAmount = item?.totalPriceSet?.shopMoney?.amount || 0;
//                 const currencyCode = item?.totalPriceSet?.shopMoney?.currencyCode || "USD";

//                 // Upsert the basic order data
//                 const upsertedOrder = await prisma.order.upsert({
//                     where: { id: orderId },
//                     create: {
//                         id: orderId,
//                         shop: shop,
//                         name: item.name,
//                         email: item.email || null,
//                         createdAt: new Date(item.createdAt),
//                         updatedAt: new Date(item.updatedAt),
//                         totalPrice: parseFloat(totalPriceAmount),
//                         currencyCode: currencyCode,
//                         customerId: item.customer?.id || null,
//                         customerFirstName: item.customer?.firstName || null,
//                         customerLastName: item.customer?.lastName || null,
//                         address1: item.customer?.defaultAddress?.address1 || null,
//                         address2: item.customer?.defaultAddress?.address2 || null,
//                         city: item.customer?.defaultAddress?.city || null,
//                         province: item.customer?.defaultAddress?.province || null,
//                         country: item.customer?.defaultAddress?.country || null,
//                         zip: item.customer?.defaultAddress?.zip || null,
//                         phone: item.customer?.phone || item.phone || null,
//                     },
//                     update: {
//                         name: item.name,
//                         email: item.email || null,
//                         createdAt: new Date(item.createdAt),
//                         updatedAt: new Date(item.updatedAt),
//                         totalPrice: parseFloat(totalPriceAmount),
//                         currencyCode: currencyCode,
//                         customerId: item.customer?.id || null,
//                         customerFirstName: item.customer?.firstName || null,
//                         customerLastName: item.customer?.lastName || null,
//                         address1: item.customer?.defaultAddress?.address1 || null,
//                         address2: item.customer?.defaultAddress?.address2 || null,
//                         city: item.customer?.defaultAddress?.city || null,
//                         province: item.customer?.defaultAddress?.province || null,
//                         country: item.customer?.defaultAddress?.country || null,
//                         zip: item.customer?.defaultAddress?.zip || null,
//                         phone: item.customer?.phone || item.phone || null,
//                     },
//                 });
//                 console.log(`Upserted order ${orderId} for shop ${shop}`);
//             }
//         } catch (error) {
//             console.error(`Failed to process line: ${line}`, error);
//         }
//     }
// };

// // Cron Job to run for all stores
// cron.schedule("59 18 * * *", async () => {
//     console.log("Starting data sync cron job for all stores");

//     // Step 1: Get all the shops that have access tokens stored
//     const allStores = await prisma.session.findMany({
//         where: { accessToken: { not: null } }, // Find all stores with valid access tokens
//     });

//     // Step 2: Loop over each store and run the bulk operation
//     for (const store of allStores) {
//         const { shop: shopDomain, accessToken: shopAccessToken } = store;
        
// console.log("shopDomain", shopDomain);
// console.log("shopAccessToken", shopAccessToken);
// console.log("store", store);
//         try {
//             // Step 3: Authenticate Shopify admin client for the store
//             const admin = new GraphqlClient({
//               storeDomain: shopDomain,  // Correct key is 'storeDomain' instead of 'domain'
//               accessToken: shopAccessToken,
//               apiVersion: ApiVersion.April24 // Ensure you use the correct API version
//           });

//             // Ensure the GraphQL client uses the correct API version
     
//             // Step 4: Initiate the bulk operation
//             const { success, bulkOperation, error } = await initiateBulkOperation(admin);
//             if (!success) {
//                 console.error(`Failed to initiate bulk operation for ${shopDomain}: ${error}`);
//                 continue;
//             }

//             let operationStatus = bulkOperation.status;
//             let bulkDataUrl = null;

//             // Step 5: Poll for bulk operation completion
//             while (operationStatus !== "COMPLETED") {
//                 await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
//                 const statusCheck = await checkBulkOperationStatus(admin, bulkOperation.id);
//                 operationStatus = statusCheck.status;

//                 if (operationStatus === "COMPLETED") {
//                     bulkDataUrl = statusCheck.url; // URL to fetch the result data
//                     break;
//                 } else if (operationStatus === "FAILED") {
//                     console.error(`Bulk operation failed for shop ${shopDomain}`);
//                     continue;
//                 }
//             }

//             if (!bulkDataUrl) {
//                 console.error(`No URL found for bulk data after completion for shop ${shopDomain}`);
//                 continue;
//             }

//             // Step 6: Fetch the bulk operation result data from the returned URL
//             const bulkDataResponse = await fetch(bulkDataUrl);
//             const bulkDataText = await bulkDataResponse.text();

//             // Step 7: Upsert the fetched data into PostgreSQL
//             await upsertOrderData(bulkDataText, shopDomain);

//             console.log(`Data sync completed for shop: ${shopDomain}`);
//         } catch (error) {
//             console.error(`Error syncing data for shop ${shopDomain}:`, error);
//         }
//     }

//     console.log("Data sync cron job for all stores completed.");
// });

