import crypto from "crypto";

// Modify to accept the raw body as a Buffer
export const verifyShopifyWebhook = (request: Request, rawBody: Buffer): boolean => {
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!hmacHeader) {
    console.error("Missing HMAC header");
    return false;
  }

  const secret = process.env.SHOPIFY_API_SECRET;

  // Generate HMAC hash using rawBody (Buffer)
  const hash = crypto
    .createHmac("sha256", secret!)
    .update(rawBody) // Use rawBody (Buffer)
    .digest("base64");

  return hash === hmacHeader;
};
