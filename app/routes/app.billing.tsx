// import {
//   Page,
//   Box,
//   Button,
//   Card,
//   Text,
//   Grid,
//   Divider,
//   BlockStack,
//   ExceptionList
// } from "@shopify/polaris";

// import {
//   CheckIcon 
// } from "@shopify/polaris-icons";
// import { json } from "@remix-run/node";
// import { useLoaderData } from "@remix-run/react";
// import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "~/shopify.server";

// export async function loader({ request }) {
//   const { billing } = await authenticate.admin(request);

//   try {
//     const billingCheck = await billing.require({
//       plans: [MONTHLY_PLAN, ANNUAL_PLAN],
//       isTest: true,
//       onFailure: () => {
//         throw new Error('No active plan');
//       },
//     });

//     const subscription = billingCheck.appSubscriptions[0];
//     console.log(`Shop is on ${subscription.name} (id ${subscription.id})`);
//     return json({ billing, plan: subscription });

//   } catch (error) {
//     if (error.message === 'No active plan') {
//       console.log('Shop does not have any active plans.');
//       return json({ billing, plan: { name: "Free" } });
//     }
//     throw error;
//   }
// }

// let planData = [
//   {
//     title: "Free Trial",
//     description: "Free access to all features for a limited time",
//     price: "0",
//     action: "Start Free Trial",
//     name: "Free Trial",
//     url: "/app/start-free-trial",
//     features: [
//       "Free access for 7 days",
//       "Access to all features",
//       "No credit card required",
//       "Limited to 1 Shopify store",
//       "Standard support",
//       "Basic analytics"
//     ]
//   },
//   {
//     title: "Pro",
//     description: "Pro plan with advanced features",
//     price: "9.99",
//     name: "Monthly subscription",
//     action: "Upgrade to Pro",
//     url: "https://admin.shopify.com/charges/merlin-refund-dashboard/pricing_plans",
//     features: [
//       "Unlimited access to all features",
//       "Manage up to 10,000 products",
//       "Advanced customization options",
//       "Priority support",
//       "Detailed analytics and reports",
//       "Integration with multiple Shopify stores",
//       "Regular updates and new features"
//     ]
//   }
// ];


// export default function PricingPage() {
//   const { plan } = useLoaderData();

//   return (
//     <Page>
//       <ui-title-bar title="Pricing" />
//       <Card sectioned>
//         <div style={{display: "flex", justifyContent: "space-between"}}>

        
//         {/* <Text variant="headingMd">Change your plan</Text> */}
       
//         { plan.name === "Monthly subscription" ? (
//           <>
//             <Text variant="bodyMd">You're currently on pro plan. All features are unlocked.</Text>
//             <Box padding="4">
//               <Button primary url='/app/cancel'>Cancel Plan</Button>
//             </Box>
//           </>
//         ) : (
//           <Text variant="bodyMd">You're currently on free plan. Upgrade to pro to unlock more features.</Text>
//         )}
//          {/* <Box padding="4">
//           <img src="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/tag.png?v=1705280535" alt="Change Plan Illustration" style={{ maxWidth: "100px", margin: "auto" }} />
//         </Box> */}
//         </div>
//       </Card>

//       <div style={{ margin: "0.5rem 0"}}>
//         <Divider />
//       </div>

//       <Grid>

//         {planData.map((plan_item, index) => (
//           <Grid.Cell key={index} columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
//             <Card background={ plan_item.name === plan.name ? "bg-surface-success" : "bg-surface" } sectioned>
//               <Box padding="400">
//                 <Text as="h3" variant="headingMd">
//                   {plan_item.title}
//                 </Text>
//                 <Box as="p" variant="bodyMd">
//                   {plan_item.description}
//                   <br />
//                   <Text as="p" variant="headingLg" fontWeight="bold">
//                     {plan_item.price === "0" ? "" : "$" + plan_item.price}
//                   </Text>
//                 </Box>

//                 <div style={{ margin: "0.5rem 0"}}>
//                   <Divider />
//                 </div>

//                 <BlockStack gap={100}>
//                   {plan_item.features.map((feature, index) => (
//                     <ExceptionList
//                       key={index}
//                       items={[
//                         {
//                           icon: CheckIcon,
//                           description: feature,
//                         },
//                       ]}
//                     />
//                   ))}
//                 </BlockStack>
//                 <div style={{ margin: "0.5rem 0"}}>
//                   <Divider />
//                 </div>

//                 { plan_item.name === "Monthly subscription" ?
//                   plan.name !== "Monthly subscription" ? (
//                     <Button primary url={plan_item.url}>
//                       {plan_item.action}
//                     </Button>
//                   ) : (
//                     <Text as="p" variant="bodyMd">
//                       You're currently on this plan
//                     </Text>
//                   )
//                 : null }
//               </Box>
//             </Card>
//           </Grid.Cell>
//         ))}

//       </Grid>

//     </Page>
//   );
// }


import {
  Page,
  Box,
  Button,
  Card,
  Text,
  Grid,
  Divider,
  BlockStack,
  ExceptionList
} from "@shopify/polaris";

import {
  CheckIcon 
} from "@shopify/polaris-icons";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "~/shopify.server";

export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);

  try {
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: true,
      onFailure: () => {
        throw new Error('No active plan');
      },
    });

    const subscription = billingCheck.appSubscriptions[0];
    console.log(`Shop is on ${subscription.name} (id ${subscription.id})`);
    return json({ billing, plan: subscription });

  } catch (error) {
    if (error.message === 'No active plan') {
      console.log('Shop does not have any active plans.');
      return json({ billing, plan: { name: "Free" } });
    }
    throw error;
  }
}

let planData = [
  {
    title: "Free Trial",
    description: "Free access to all features for a limited time",
    price: "0",
    action: "Start Free Trial",
    name: "Free Trial",
    url: "/app/start-free-trial",
    features: [
      "Free access for 7 days",
      "Access to all features",
      "No credit card required",
      "Limited to 1 Shopify store",
      "Standard support",
      "Basic analytics"
    ]
  },
  {
    title: "Pro",
    description: "Pro plan with advanced features",
    price: "9.99",
    name: "Monthly subscription",
    action: "Upgrade to Pro",
    url: "https://admin.shopify.com/charges/merlin-refund-dashboard/pricing_plans",
    features: [
      "Unlimited access to all features",
      "Manage up to 10,000 products",
      "Advanced customization options",
      "Priority support",
      "Detailed analytics and reports",
      "Integration with multiple Shopify stores",
      "Regular updates and new features"
    ]
  }
];


export default function PricingPage() {
  const { plan } = useLoaderData();

  return (
    <Page>
      <ui-title-bar title="Pricing" />
      <Card sectioned>
        <div style={{display: "flex", justifyContent: "space-between"}}>

        
        {/* <Text variant="headingMd">Change your plan</Text> */}
       
        { plan.name === "Monthly subscription" ? (
          <>
            <Text variant="bodyMd">You're currently on pro plan. All features are unlocked.</Text>
            <Box padding="4">
              <Button primary url='/app/cancel'>Cancel Plan</Button>
            </Box>
          </>
        ) : (
          <Text variant="bodyMd">You're currently on free plan. Upgrade to pro to unlock more features.</Text>
        )}
         {/* <Box padding="4">
          <img src="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/tag.png?v=1705280535" alt="Change Plan Illustration" style={{ maxWidth: "100px", margin: "auto" }} />
        </Box> */}
        </div>
      </Card>

      <div style={{ margin: "0.5rem 0"}}>
        <Divider />
      </div>

      <Grid>

        {planData.map((plan_item, index) => (
          <Grid.Cell key={index} columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
            <Card background={ plan_item.name === plan.name ? "bg-surface-success" : "bg-surface" } sectioned>
              <Box padding="400">
                <Text as="h3" variant="headingMd">
                  {plan_item.title}
                </Text>
                <Box as="p" variant="bodyMd">
                  {plan_item.description}
                  <br />
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {plan_item.price === "0" ? "" : "$" + plan_item.price}
                  </Text>
                </Box>

                <div style={{ margin: "0.5rem 0"}}>
                  <Divider />
                </div>

                <BlockStack gap={100}>
                  {plan_item.features.map((feature, index) => (
                    <ExceptionList
                      key={index}
                      items={[
                        {
                          icon: CheckIcon,
                          description: feature,
                        },
                      ]}
                    />
                  ))}
                </BlockStack>
                <div style={{ margin: "0.5rem 0"}}>
                  <Divider />
                </div>

                { plan_item.name === "Monthly subscription" ?
                  plan.name !== "Monthly subscription" ? (
                    <Button primary url="https://admin.shopify.com/store/quickstart-2c310ca9/charges/merlin-refund-dashboard/pricing_plans">
                      {plan_item.action}
                    </Button>
                  ) : (
                    <Text as="p" variant="bodyMd">
                      You're currently on this plan
                    </Text>
                  )
                : null }
              </Box>
            </Card>
          </Grid.Cell>
        ))}

      </Grid>

    </Page>
  );
}
