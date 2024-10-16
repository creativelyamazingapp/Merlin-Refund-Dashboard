import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { verifyShopifyWebhook } from "~/utils/verifyWebhook";
import { PrismaClient } from "@prisma/client";


export const action = async ({ request }: ActionFunctionArgs) => {
  const prisma = new PrismaClient();

 

  // Now pass the `request` object and rawBody directly to authenticate.webhook
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  // console.log("Payload", payload);

  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
        console.log("======================App Uninstalled Webhook======================");
      }

      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    case "ORDER_UPDATED":
      if (session) {
        console.log("Received Order Updated webhook");
      }

      break;


    case "ORDERS_CREATE":
      if (session) {
        {
          console.log("==============Order Create Webhook Started==============");

          // Ensure it's a POST request
          if (request.method !== "POST") {
            return json({ error: "Invalid request method" }, { status: 405 });
          }

          try {
            const newOrder = await prisma.$transaction(async (prisma) => {
              // Upsert Order
              const order = await prisma.order.upsert({
                where: { id: `gid://shopify/Order/${payload.id.toString()}` },
                create: {
                  id: `gid://shopify/Order/${payload.id.toString()}`,
                  shop: session.shop,
                  name: payload.name,
                  email: payload.email,
                  createdAt: new Date(payload.created_at),
                  updatedAt: new Date(payload.updated_at),
                  totalPrice: parseFloat(payload.total_price) || 0.0,
                  currencyCode: payload.currency,
                  customerId: payload.customer?.id?.toString() || null,
                  customerFirstName: payload.customer?.first_name || null,
                  customerLastName: payload.customer?.last_name || null,
                  shippingFirstName: payload.shipping_address?.first_name || null,
                  shippingLastName: payload.shipping_address?.last_name || null,
                  address1: payload.shipping_address?.address1 || null,
                  address2: payload.shipping_address?.address2 || null,
                  city: payload.shipping_address?.city || null,
                  province: payload.shipping_address?.province || null,
                  country: payload.shipping_address?.country || null,
                  zip: payload.shipping_address?.zip || null,
                },
                update: {
                  name: payload.name,
                  email: payload.email,
                  updatedAt: new Date(payload.updated_at),
                  totalPrice: parseFloat(payload.total_price) || 0.0,
                  currencyCode: payload.currency,
                  customerId: payload.customer?.id?.toString() || null,
                  customerFirstName: payload.customer?.first_name || null,
                  customerLastName: payload.customer?.last_name || null,
                  shippingFirstName: payload.shipping_address?.first_name || null,
                  shippingLastName: payload.shipping_address?.last_name || null,
                  address1: payload.shipping_address?.address1 || null,
                  address2: payload.shipping_address?.address2 || null,
                  city: payload.shipping_address?.city || null,
                  province: payload.shipping_address?.province || null,
                  country: payload.shipping_address?.country || null,
                  zip: payload.shipping_address?.zip || null,
                },
              });

              // Upsert Line Items and their related Products
              for (const item of payload.line_items) {
                let product = null;

                // Check if productId exists and upsert the product if necessary
                if (item.product_id) {
                  product = await prisma.product.upsert({
                    where: { id: item.product_id.toString() },
                    create: {
                      id: item.product_id.toString(),
                      title: item.name, // Assuming product title is the same as line item name
                      images: item.image ? [item.image] : [], // Assuming the image is an array of one image
                    },
                    update: {
                      title: item.name,
                      images: item.image ? [item.image] : [],
                    },
                  });
                }

                // Prepare create and update objects
                const createData = {
                  id: item.id.toString(),
                  orderId: order.id,
                  name: item.name,
                  title: item.title,
                  quantity: item.quantity || 1,
                  price: parseFloat(item.price) || 0.0,
                  imageUrl: item.image || null,
                  productId: product?.id || "", // Ensure productId is always a string
                };

                const updateData = {
                  name: item.name,
                  title: item.title,
                  quantity: item.quantity || 1,
                  price: parseFloat(item.price) || 0.0,
                  imageUrl: item.image || null,
                  productId: product?.id || "", // Ensure productId is always a string
                };

                // Upsert Line Item
                await prisma.orderLineItem.upsert({
                  where: { id: item.id.toString() },
                  create: createData,
                  update: updateData,
                });
              }

              return order;
            });

            console.log("Order and line items upserted successfully:", newOrder);
          } catch (error) {
            console.error("Error upserting order and line items:", error);
          }
        }
      } else {
        console.log("No session found for shop", shop);
      }

        break;


        case "REFUNDS_CREATE":
          if (session) {
            console.log("==============Refund Create Webhook Received==============");
            console.log("Refund Payload", payload);
        
            // Ensure it's a POST request
            if (request.method !== "POST") {
                return json({ error: "Invalid request method" }, { status: 405 });
            }
        
            try {
                // Log the entire payload to debug
                console.log("Payload received:", JSON.stringify(payload, null, 2));
        
                // Extract the order ID from the payload
                const gidOrderId = payload.order_id;
                const orderId = gidOrderId.toString(); // Ensure the orderId is a string
        
                // Check if the order exists in the database
                const existingOrder = await prisma.order.findUnique({
                    where: { id: `gid://shopify/Order/${orderId}` } // Ensure the correct format is used
                });
        
                // If order exists, proceed to insert refund data
                if (existingOrder) {
                    // Extract necessary data from the refund in the payload
                    const { id: refundId, created_at: createdAt, note, transactions, refund_line_items } = payload;
        
                    // Calculate total refund amount (from transactions array in the refund)
                    const totalRefundAmount = transactions.reduce((acc, transaction) => acc + parseFloat(transaction.amount), 0);
        
                    // Currency code can be taken from transactions, or set as default (e.g., "USD")
                    const currencyCode = transactions[0]?.currency || "USD";
        
                    // Insert or update refund record
                    const newRefund = await prisma.refund.upsert({
                        where: { id: `gid://shopify/Refund/${refundId}` },
                        create: {
                            id: `gid://shopify/Refund/${refundId}`,
                            amount: totalRefundAmount,
                            currencyCode,
                            createdAt: new Date(createdAt),
                            orderId: existingOrder.id,
                            note: note || null,
                        },
                        update: {
                            amount: totalRefundAmount,
                            currencyCode,
                            createdAt: new Date(createdAt),
                            note: note || null,
                        }
                    });
        
                    console.log("Refund upserted successfully:", newRefund);
        
                    // Insert or update refund line items
                    for (const lineItem of refund_line_items) {
                        const lineItemId = lineItem.line_item_id.toString();
                        const quantity = lineItem.quantity || 1;
        
                        await prisma.refundLineItem.upsert({
                            where: { id: `gid://shopify/Refund/${refundId}`  },
                            create: {
                                id: `gid://shopify/LineItem/${lineItemId.toString()}`,
                                refundId: newRefund.id,
                                lineItemId: `gid://shopify/LineItem/${lineItemId.toString()}`,
                                title: lineItem.line_item.title,
                                quantity,
                                orderName: existingOrder.name, // Store the order name for reference
                            },
                            update: {
                                title: lineItem.line_item.title,
                                quantity,
                                orderName: existingOrder.name,
                            }
                        });
        
                        console.log(`Refund line item upserted for item ID: ${lineItemId}`);
                    }
        
                    // Return a successful response
                    return json({ message: "Refund processed successfully" }, { status: 200 });
                } else {
                    console.error(`Order with ID ${orderId} does not exist in the database.`);
                    return json({ error: `Order with ID ${orderId} does not exist` }, { status: 404 });
                }
            } catch (error) {
                console.error("Error processing refund webhook:", error);
                return json({ error: "Error processing refund webhook" }, { status: 500 });
            }
        } else {
            console.log("No session found for shop", shop);
        }

        break;
        

        case "ORDERS_CANCELLED":
          if (session) {
            console.log("==============Order Cancelled Webhook Received==============");
        
            // Ensure it's a POST request
            if (request.method !== "POST") {
                return json({ error: "Invalid request method" }, { status: 405 });
            }
        
            try {
                // Log the entire payload to debug
                console.log("Payload received:", JSON.stringify(payload, null, 2));
        
                // Extract the order ID from the payload
                const gidOrderId = payload.admin_graphql_api_id;
                const orderId = gidOrderId.split("/").pop(); // Extracts the ID after the last '/'
        
                // Check if the order exists in the database
                const existingOrder = await prisma.order.findUnique({
                    where: { id: `gid://shopify/Order/${orderId}` } // Ensure the correct format is used
                });
        
                // If order exists, proceed to update cancellation data and insert refund data
                if (existingOrder) {
                    // Update the order record to reflect cancellation details
                    const cancelledOrder = await prisma.order.update({
                        where: { id: `gid://shopify/Order/${orderId}` },
                        data: {
                            updatedAt: new Date(payload.cancelled_at),
                            totalPrice: parseFloat(payload.total_price), // Updating the total price
                            currencyCode: payload.currency, // Updating the currency code
                            name: payload.name, // Updating order name or number
                            email: payload.email || existingOrder.email, // If email exists, update it
                            customerId: payload.customer?.id.toString(), // Update customer ID
                            customerFirstName: payload.customer?.first_name,
                            customerLastName: payload.customer?.last_name,
                            shippingFirstName: payload.shipping_address?.first_name,
                            shippingLastName: payload.shipping_address?.last_name,
                            address1: payload.shipping_address?.address1,
                            address2: payload.shipping_address?.address2,
                            city: payload.shipping_address?.city,
                            province: payload.shipping_address?.province,
                            country: payload.shipping_address?.country,
                            zip: payload.shipping_address?.zip,
                        }
                    });
        
                    console.log("Order updated successfully with cancellation details:", cancelledOrder);
        
                    // Process refunds if they exist
                    if (payload.refunds && payload.refunds.length > 0) {
                        for (const refund of payload.refunds) {
                            // Extract necessary data from each refund in the refunds array
                            const { id: refundId, created_at: createdAt, note, transactions, refund_line_items } = refund;
        
                            // Calculate total refund amount (from transactions array in the refund)
                            const totalRefundAmount = transactions.reduce((acc, transaction) => acc + parseFloat(transaction.amount), 0);
        
                            // Currency code can be taken from transactions, or set as default (e.g., "USD")
                            const currencyCode = transactions[0]?.currency || "USD";
        
                            // Insert or update refund record
                            const newRefund = await prisma.refund.upsert({
                                where: { id: `gid://shopify/Refund/${refundId}` },
                                create: {
                                    id: `gid://shopify/Refund/${refundId}`,
                                    amount: totalRefundAmount,
                                    currencyCode,
                                    createdAt: new Date(createdAt),
                                    orderId: existingOrder.id,
                                    note: note || null,
                                },
                                update: {
                                    amount: totalRefundAmount,
                                    currencyCode,
                                    createdAt: new Date(createdAt),
                                    note: note || null,
                                }
                            });
        
                            console.log("Refund upserted successfully:", newRefund);
        
                            // Insert or update refund line items
                            for (const lineItem of refund_line_items) {
                                const lineItemId = lineItem.line_item_id.toString();
                                const quantity = lineItem.quantity || 1;
        
                                await prisma.refundLineItem.upsert({
                                    where: { id: `gid://shopify/Refund/${refundId}`  },
                                    create: {
                                      id: `gid://shopify/LineItem/${lineItemId.toString()}`,
                                      refundId: newRefund.id,
                                      lineItemId: `gid://shopify/LineItem/${lineItemId.toString()}`,
                                      title: lineItem.line_item.title,
                                        quantity,
                                        orderName: existingOrder.name, // Store the order name for reference
                                    },
                                    update: {
                                        title: lineItem.line_item.title,
                                        quantity,
                                        orderName: existingOrder.name,
                                    }
                                });
        
                                console.log(`Refund line item upserted for item ID: ${lineItemId}`);
                            }
                        }
                    }
        
                    // Return a successful response
                    return json({ message: "Order cancellation processed successfully" }, { status: 200 });
                } else {
                    console.error(`Order with ID ${orderId} does not exist in the database.`);
                    return json({ error: `Order with ID ${orderId} does not exist` }, { status: 404 });
                }
            } catch (error) {
                console.error("Error processing order cancellation webhook:", error);
                return json({ error: "Error processing order cancellation webhook" }, { status: 500 });
            }
        } else {
            console.log("No session found for shop", shop);
        }
        
        
      
          break;

  

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
