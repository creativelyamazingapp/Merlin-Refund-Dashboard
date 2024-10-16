import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {session} = await authenticate.admin(request);
//  const {shop} = session;
//  const app_handle = process.env.SHOPIFY_APP_HANDLE;

//  // Redirect to Shopify's pricing plan page
//  return redirect(`https://admin.shopify.com/store/${shop}/charges/${app_handle}/pricing_plans`);

  return null;
};
