import {
    Card,
    Button,
    Collapsible,
    BlockStack,
    Icon,
    Text,
  } from '@shopify/polaris';
  import { useState, useCallback } from 'react';
  import { CaretDownIcon } from '@shopify/polaris-icons';
  
  export function FAQ() {
    const [open, setOpen] = useState([true, false, false, false, false]);
  
    const handleToggle = useCallback((index) => {
      setOpen((prevOpen) => {
        const newOpen = [...prevOpen];
        newOpen[index] = !newOpen[index];
        return newOpen;
      });
    }, []);
  
    const faqs = [
      {
        question: "How does the Shopify Refund Management App help me manage refunds more efficiently?",
        answer: "The app centralizes all refund-related tasks in a single interface, allowing you to manage replacements, refunds, exchanges, and disputes without switching between different platforms. It provides detailed order information, advanced filtering and sorting options, and export functionality for comprehensive refund management.",
      },
      {
        question: "Can I export my order and refund data for offline analysis?",
        answer: "Yes, the app allows you to export order and refund data to CSV format. This feature enables you to perform offline analysis, generate reports, and keep records of your transactions.",
      },
      {
        question: "How does the app handle customer information and privacy?",
        answer: "The app fetches customer information, including names and emails, to provide a complete view of each order. This data is handled securely and is only used for the purpose of managing refunds and customer support tasks.",
      },
      {
        question: "What types of visual insights does the app provide?",
        answer: "The app includes charts and gauges that visualize total sales, refunds, and profit margins. These visual insights help you understand your store's financial performance and make informed decisions to improve profitability and customer satisfaction.",
      },
      {
        question: "How do I copy customer information and refund notes to the clipboard?",
        answer: "The app features a convenient copy-to-clipboard functionality. You can easily copy customer names, emails, and refund notes by clicking the copy icon next to the respective field. This helps streamline communication and documentation processes.",
      },
    ];
  
    return (
      <div style={{ height: 'auto', gap: "100px" }}>
        <Card >
            <div style={{gap: "100px"}}>
          {faqs.map((faq, index) => (
            <BlockStack gap={"100"} >
              <Button
                onClick={() => handleToggle(index)}
                ariaExpanded={open[index]}
                ariaControls={`collapsible-${index}`}
                fullWidth
                plain
              >
                <BlockStack gap={100} >
                  <Icon source={CaretDownIcon} />
                  <Text variant="CaretDownIcon" fontWeight="bold">
                    {faq.question}
                  </Text>
                </BlockStack>
              </Button>
              <Collapsible
                open={open[index]}
                id={`collapsible-${index}`}
                transition={{ duration: '500ms', timingFunction: 'ease-in-out' }}
                expandOnPrint
              >
                <BlockStack>
                  <p>{faq.answer}</p>
                </BlockStack>
              </Collapsible>
            </BlockStack>
          ))}
          </div>
        </Card>
      </div>
    );
  }
  