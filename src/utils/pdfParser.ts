import * as pdfjsLib from 'pdfjs-dist';
import { PackingSlip, ShippingLabel, PackingSlipGroup, ProcessedOrder, OrphanedPackingSlip, AnalysisResult } from '../types';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const extractTextFromPage = async (
  page: pdfjsLib.PDFPageProxy
): Promise<string> => {
  const textContent = await page.getTextContent();

  // Collect all text items without sorting to preserve all content
  const items = textContent.items as any[];

  // Create a more comprehensive text extraction
  let allText = '';

  for (const item of items) {
    if (item.str) {
      allText += item.str + ' ';
    }
  }

  return allText.trim();
};

export const isPackingSlip = (text: string): boolean => {
  return text.includes('Packing slip');
};

export const isShippingLabel = (text: string): boolean => {
  // If it's a packing slip, it's not a label
  return !text.includes('Packing slip');
};

export const extractOrderNumber = (text: string): string | null => {
  const orderMatch = text.match(/Order\s*#:\s*([\w\-]+)/i);
  return orderMatch ? orderMatch[1] : null;
};


export const analyzePDF = async (
  pdfFile: File
): Promise<AnalysisResult> => {
  try {
    console.log('Starting PDF analysis...');
    const arrayBuffer = await pdfFile.arrayBuffer();
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF loaded successfully');
    const numPages = pdf.numPages;
    console.log('Number of pages:', numPages);

    const allPages: Array<{ pageNumber: number; isPackingSlip: boolean; orderNumber: string | null }> = [];

    // First pass: classify all pages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await extractTextFromPage(page);

      console.log(`\n=== Page ${i} ===`);
      console.log('Text length:', text.length);
      console.log('Full text:', text.substring(0, 500));

      if (isPackingSlip(text)) {
        const orderNumber = extractOrderNumber(text);
        console.log(`Page ${i}: Packing slip detected, order: ${orderNumber}`);
        allPages.push({ pageNumber: i, isPackingSlip: true, orderNumber });
      } else {
        console.log(`Page ${i}: Shipping label (non-packing slip page)`);
        allPages.push({ pageNumber: i, isPackingSlip: false, orderNumber: null });
      }
    }

    const totalPackingSlipsDetected = allPages.filter(page => page.isPackingSlip).length;
    const totalShippingLabelsDetected = allPages.filter(page => !page.isPackingSlip).length;

    // Second pass: group consecutive packing slips and map to labels
    const groups = groupPackingSlipsSequentially(allPages);

    console.log('Grouped packing slips:', groups.length);

    const orphanedSlips = groups
      .filter(group => group.shippingLabel === null)
      .flatMap(group => group.packingSlips.map(slip => ({
        pageNumber: slip.pageNumber,
        orderNumber: slip.orderNumber,
      })));

    return {
      groups,
      orphanedSlips,
      totalPackingSlipsDetected,
      totalShippingLabelsDetected
    };
  } catch (error) {
    console.error('Error in analyzePDF:', error);
    throw new Error(`Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const groupPackingSlipsSequentially = (
  pages: Array<{ pageNumber: number; isPackingSlip: boolean; orderNumber: string | null }>
): PackingSlipGroup[] => {
  const groups: PackingSlipGroup[] = [];
  let currentGroup: PackingSlip[] = [];
  let currentOrderNumber: string | null = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    if (page.isPackingSlip && page.orderNumber) {
      // Add to current group if same order number or start new group
      if (currentOrderNumber === null || currentOrderNumber === page.orderNumber) {
        currentOrderNumber = page.orderNumber;
        currentGroup.push({
          pageNumber: page.pageNumber,
          orderNumber: page.orderNumber,
        });
      } else {
        // Different order number, so we need to finalize the current group
        // Look ahead to see if there's a shipping label
        const nextPage = pages[i - 1 + 1]; // Current page is the new slip, look at what comes after
        if (currentGroup.length > 0) {
          groups.push({
            orderNumber: currentOrderNumber,
            packingSlips: currentGroup,
            shippingLabel: null, // Will be set if we find a label
          });
        }
        // Start new group
        currentGroup = [{
          pageNumber: page.pageNumber,
          orderNumber: page.orderNumber,
        }];
        currentOrderNumber = page.orderNumber;
      }
    } else if (!page.isPackingSlip) {
      // This is a shipping label page
      if (currentGroup.length > 0 && currentOrderNumber) {
        // Assign this label to the current group
        groups.push({
          orderNumber: currentOrderNumber,
          packingSlips: currentGroup,
          shippingLabel: { pageNumber: page.pageNumber },
        });
        // Reset for next group
        currentGroup = [];
        currentOrderNumber = null;
      }
    }
  }

  // Handle any remaining packing slips without a label
  if (currentGroup.length > 0 && currentOrderNumber) {
    groups.push({
      orderNumber: currentOrderNumber,
      packingSlips: currentGroup,
      shippingLabel: null,
    });
  }

  return groups;
};

export const convertGroupsToOrders = (
  groups: PackingSlipGroup[]
): ProcessedOrder[] => {
  return groups
    .filter(group => group.shippingLabel !== null)
    .map(group => ({
      orderNumber: group.orderNumber,
      packingSlips: group.packingSlips,
      shippingLabel: group.shippingLabel!,
    }));
};
