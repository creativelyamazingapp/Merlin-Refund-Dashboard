import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Listbox,
} from "@shopify/polaris";
import HomeImage from "../component/home.png";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { FAQ } from "~/component/FAQ";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page fullWidth title="Refund Dashboard">
      <BlockStack inlineAlign="center" >
        <Layout>
          <Layout.Section>
            <BlockStack inlineAlign="center" gap={"1000"}>
              <Card>
                <Card>
                  <BlockStack gap={{ xs: "4", sm: "8", md: "12", lg: "16", xl: "20" }}>
                    <BlockStack gap={{ xs: "2", sm: "4", md: "6", lg: "8", xl: "10" }}>
                      <Text as="h1" variant="headingXl">
                        Shopify Refund Management App is a powerful tool designed to
                        streamline and enhance the refund management process for
                        Shopify store owners.
                      </Text>
                    </BlockStack>
                    <BlockStack gap={{ xs: "2", sm: "4", md: "6", lg: "8", xl: "10" }}>
                      <Text as="h3" variant="headingLg">
                        Key features include:
                      </Text>
                      <Text as="p" variant="bodyLg">
                        <List type="bullet">
                          <List.Item>
                            Centralized Refund Management: Manage all refund-related
                            tasks from a single interface, eliminating the need to
                            switch between different platforms.
                          </List.Item>
                          <List.Item>
                            Detailed Order Information: Access detailed order
                            information, including customer names, emails, product
                            titles, and financial details.
                          </List.Item>
                          <List.Item>
                            Advanced Filtering and Sorting: Filter and sort orders
                            based on various criteria such as date, total amount,
                            and refund status.
                          </List.Item>
                          <List.Item>
                            Export Functionality: Export order and refund data to
                            CSV for offline analysis and reporting.
                          </List.Item>
                          <List.Item>
                            Copy to Clipboard: Easily copy customer information and
                            refund notes to the clipboard for quick reference.
                          </List.Item>
                          <List.Item>
                            Visual Insights: Utilize charts and gauges to visualize
                            total sales, refunds, and profit margins, helping store
                            owners make informed decisions.
                          </List.Item>
                        </List>
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Card>
              <Card>
                <Card>
                  <BlockStack >
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: "10px"
                    }}>
                      <img style={{ width: "100%", maxWidth: "900px" }} src="https://refund-dashboard.s3.ap-southeast-1.amazonaws.com/home.png" alt="Refund Dashboard"/>
                      {/* <img style={{ width: "100%", maxWidth: "900px" }} src="app\component\refund-product.png" alt="Refund by product"/> */}
                    </div>
                  </BlockStack>
                </Card>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
        <div style={{width: "80%", justifyContent: "center", marginTop: "20px"}}>
      <FAQ />
      </div>
      </BlockStack>
      
      
    </Page>
  );
}
