import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-04";
import prisma from "~/db.server";
import { redirect } from "@remix-run/node";

export const MONTHLY_PLAN = 'Monthly subscription';
export const ANNUAL_PLAN = 'Annual subscription';

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,


  webhooks: {
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.EventBridge,
      arn: "arn:aws:events:ap-southeast-1::event-source/aws.partner/shopify.com/144587390977/CUSTOMERS_DATA_REQUEST",
      
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.EventBridge,
      arn: "arn:aws:events:ap-southeast-1::event-source/aws.partner/shopify.com/144587390977/CUSTOMERS_REDACT"
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.EventBridge,
      arn: "arn:aws:events:ap-southeast-1::event-source/aws.partner/shopify.com/144587390977/SHOP_REDACT"
    },
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "https://refund-dashboard.fly.dev/webhooks", 
    },
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "https://refund-dashboard.fly.dev/webhooks",

    },
    REFUNDS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "https://refund-dashboard.fly.dev/webhooks",

    },
    ORDERS_CANCELLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "https://refund-dashboard.fly.dev/webhooks",

    },
  },
  hooks: {
    afterAuth: async ({ session, }) => {
      const { shop, accessToken } = session;
      shopify.registerWebhooks({ session });
      
    // Redirect to a specific URL after app installation
    redirect(`https://admin.shopify.com/store/${shop}/charges/merlin-refund-dashboard/pricing_plans`);
    },
  },


  billing: {
    [MONTHLY_PLAN]: {
      amount: 10,
      currencyCode: 'USD',
      interval: BillingInterval.Every30Days,
    },
    [ANNUAL_PLAN]: {
      amount: 50,
      currencyCode: 'USD',
      interval: BillingInterval.Annual,
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),


    


});


export default shopify;
export const apiVersion = ApiVersion.April24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
