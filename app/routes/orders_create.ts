import { json } from "@remix-run/node";
import crypto from "crypto";

const verifyShopifyWebhook = async (request: Request) => {
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
  const rawBody = await request.text();  // Get the raw body as text
  const secret = process.env.SHOPIFY_API_KEY;

  const generatedHmac = crypto
    .createHmac("sha256", secret!)
    .update(rawBody, "utf8") // Use the raw body as input here
    .digest("base64");

  return hmacHeader === generatedHmac;
};


export const action = async ({ request }) => {
  // Ensure it's a POST request
  if (request.method !== "POST") {
    return json({ error: "Invalid request method" }, { status: 405 });
  }

  // Verify the Shopify webhook request (optional, but recommended)
  if (!verifyShopifyWebhook(request)) {
    return json({ error: "Webhook validation failed" }, { status: 401 });
  }

  // Parse the order data from the request body
  const orderData = await request.json();

  try {
    // Insert the order into the database using Prisma
    const newOrder = await prisma.order.create({
      data: {
        id: orderData.id.toString(), // Shopify Order ID
        name: orderData.name,
        email: orderData.email || null,
        createdAt: new Date(orderData.created_at),
        updatedAt: new Date(orderData.updated_at),
        totalPrice: parseFloat(orderData.total_price),
        currencyCode: orderData.currency || "USD",

        // Customer Details
        customerId: orderData.customer?.id?.toString() || null,
        customerFirstName: orderData.customer?.first_name || null,
        customerLastName: orderData.customer?.last_name || null,

        // Shipping Address Details
        shippingFirstName: orderData.shipping_address?.first_name || null,
        shippingLastName: orderData.shipping_address?.last_name || null,
        address1: orderData.shipping_address?.address1 || null,
        address2: orderData.shipping_address?.address2 || null,
        city: orderData.shipping_address?.city || null,
        province: orderData.shipping_address?.province || null,
        country: orderData.shipping_address?.country || null,
        zip: orderData.shipping_address?.zip || null,

        // Line items (relational data)
        lineItems: {
          create: orderData.line_items.map((item) => ({
            id: item.id.toString(),
            name: item.name,
            title: item.title,
            imageUrl: item.image || null,
          })),
        },
      },
    });

    return json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error("Error inserting order:", error);
    return json({ error: "Error inserting order" }, { status: 500 });
  }
};
