import * as pdfjsLib from 'pdfjs-dist';
import { PackingSlip, ShippingLabel, PackingSlipGroup, ProcessedOrder, AnalysisResult } from '../types';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const extractTextFromPage = async (
  page: pdfjsLib.PDFPageProxy
): Promise<string> => {
  const textContent = await page.getTextContent();

  const items = textContent.items as any[];

  const textItems: Array<{ str: string; y: number; x: number }> = [];

  for (const item of items) {
    if (item.str && item.str.trim().length > 0) {
      textItems.push({
        str: item.str,
        y: item.transform[5],
        x: item.transform[4],
      });
    }
  }

  textItems.sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff < 5) {
      return a.x - b.x;
    }
    return b.y - a.y;
  });

  let allText = '';
  let lastY = null;

  for (const item of textItems) {
    if (lastY !== null && Math.abs(lastY - item.y) > 5) {
      allText += '\n';
    }
    allText += item.str + ' ';
    lastY = item.y;
  }

  return allText.trim();
};

export const isPackingSlip = (text: string): boolean => {
  return text.includes('Packing slip');
};

export const isShippingLabel = (text: string): boolean => {
  // If it's a packing slip, it's not a label
  if (text.includes('Packing slip')) {
    return false;
  }

  // Check for Royal Mail shipping label indicators
  const hasRoyalMail = text.toLowerCase().includes('royal mail');
  const hasDeliveredBy = text.toLowerCase().includes('delivered by');
  const has2ndClass = text.toLowerCase().includes('2nd class');
  const hasPostcode = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i.test(text);

  // If it has Royal Mail indicators, it's likely a shipping label
  if ((hasRoyalMail || hasDeliveredBy || has2ndClass) && hasPostcode) {
    return true;
  }

  // Default: if it's not a packing slip, treat as potential label
  return true;
};

export const extractOrderNumber = (text: string): string | null => {
  const orderMatch = text.match(/Order\s*#:\s*(#?[\w\-]+)/i);
  return orderMatch ? orderMatch[1] : null;
};

export const extractCustomerNameFromPackingSlip = (text: string): string | null => {
  // Try to extract name after "Order #:" line
  // Pattern: Shipping address: Order #: [number] \n [Name] Date:
  const afterOrderMatch = text.match(/Order\s*#:\s*[#\w\-]+\s+(.+?)\s+Date:/i);
  if (afterOrderMatch) {
    const rawName = afterOrderMatch[1].trim();
    // Check if it looks like a name (not a date or other info)
    if (!/\d{4}/.test(rawName) && rawName.length > 0) {
      return normalizeCustomerName(rawName);
    }
  }

  // Fallback: Try original pattern for older format
  const shippingAddressMatch = text.match(/Shipping address:\s*(.+?)(?=\s+\d+\s+[A-Z]|\s+Order\s*#)/i);
  if (shippingAddressMatch) {
    const rawName = shippingAddressMatch[1].trim();
    const nameParts = rawName.split(/\s+/);
    const name = nameParts.slice(0, Math.min(nameParts.length, 5)).join(' ');
    return normalizeCustomerName(name);
  }

  // Another fallback: look for name pattern after "Shipping address:"
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Shipping address:')) {
      // Look at the next few lines for a name
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const line = lines[j].trim();
        // Skip if it contains "Order #:" or "Date:"
        if (line.includes('Order #:') || line.includes('Date:')) continue;
        // Look for a line with 2-4 words that looks like a name
        const words = line.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words.length <= 4) {
          // Check if it has letters and doesn't start with numbers
          const hasLetters = /[a-zA-Z]/.test(line);
          const notAddress = !/^\d+\s/.test(line); // Doesn't start with house number
          const notPostcode = !/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i.test(line);
          if (hasLetters && notAddress && notPostcode) {
            return normalizeCustomerName(line);
          }
        }
      }
    }
  }

  return null;
};

export const extractCustomerNameFromShippingLabel = (text: string): string | null => {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  // Skip common header lines like product codes, Royal Mail text, etc.
  const skipPatterns = [
    /^\d+[,]\s*[A-Z0-9\-]+$/i, // Product codes like "1,BCBC-6018-Q10"
    /^\d+[,]\s*[A-Z0-9\-]+\s*\([^)]+\)$/i, // Product codes with parentheses like "1,MBMB-151-Q1 (116)"
    /^2nd\s+class/i,
    /^royal\s+mail/i,
    /^delivered\s+by/i,
    /^postage/i,
    /^letter$/i,
    /^[QW]\d+$/i, // Codes like "Q23", "W32"
    /^\d+g$/i, // Weight like "10g", "12.0 g"
    /^£\s*\d/i, // Price
    /^LL$/i,
    /^[A-Z0-9]{2,3}-\d+/i, // Reference codes
    /^\d+\s*[,.]\s*\d+\s*g$/i, // Weight with decimal like "12.0 g"
  ];

  // Look for the first line that looks like a person's name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines matching skip patterns
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // Look for a line with 2-5 words containing letters (likely a name)
    const words = line.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2 && words.length <= 5) {
      // Check if it has letters and looks like a name (not just numbers/codes)
      const hasLetters = /[a-zA-Z]/.test(line);
      const notAllCaps = !/^[A-Z0-9\s\-]+$/.test(line) || words.length >= 3;

      // Check if next line looks like an address (starts with number or flat/unit)
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const nextLooksLikeAddress =
        /^\d+\s+[A-Za-z]/.test(nextLine) || // "42 Brighton Road"
        /^flat\s+/i.test(nextLine) || // "Flat 1"
        /^\d+\s+[A-Z]+\s+[A-Z]+/i.test(nextLine); // "41 INNEY CLOSE"

      if (hasLetters && (notAllCaps || nextLooksLikeAddress)) {
        return normalizeCustomerName(line);
      }
    }
  }

  // Fallback: Look for any pattern that matches a typical name
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/;
  const nameMatch = text.match(namePattern);
  if (nameMatch) {
    return normalizeCustomerName(nameMatch[1]);
  }

  return null;
};

export const normalizePostcode = (postcode: string): string => {
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  // For UK postcodes, add space before last 3 characters if not present
  if (/^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/.test(cleaned)) {
    return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
  }
  return cleaned;
};

export const extractPostcode = (text: string): string | null => {
  const ukPostcodeMatch = text.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i);
  if (ukPostcodeMatch) {
    return normalizePostcode(ukPostcodeMatch[0]);
  }

  const caPostcodeMatch = text.match(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i);
  if (caPostcodeMatch) {
    return caPostcodeMatch[0].trim().toUpperCase();
  }

  const usZipMatch = text.match(/(?<!\d[-\s])\b\d{5}(?:-\d{4})?\b(?![-\s]\d)/);
  if (usZipMatch) {
    return usZipMatch[0].trim();
  }

  return null;
};

export const normalizeCustomerName = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
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

    const allPages: Array<{
      pageNumber: number;
      isPackingSlip: boolean;
      orderNumber: string | null;
      customerName: string | null;
      postcode: string | null;
    }> = [];

    // First pass: classify all pages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await extractTextFromPage(page);

      console.log(`\n=== Page ${i} ===`);
      console.log('Text length:', text.length);
      console.log('Full text:', text.substring(0, 500));

      const postcode = extractPostcode(text);

      if (isPackingSlip(text)) {
        const orderNumber = extractOrderNumber(text);
        const customerName = extractCustomerNameFromPackingSlip(text);
        console.log(`Page ${i}: Packing slip detected, order: ${orderNumber}, customer: ${customerName}, postcode: ${postcode}`);
        allPages.push({ pageNumber: i, isPackingSlip: true, orderNumber, customerName, postcode });
      } else {
        const customerName = extractCustomerNameFromShippingLabel(text);
        console.log(`Page ${i}: Shipping label, customer: ${customerName}, postcode: ${postcode}`);
        allPages.push({ pageNumber: i, isPackingSlip: false, orderNumber: null, customerName, postcode });
      }
    }

    const totalPackingSlipsDetected = allPages.filter(page => page.isPackingSlip).length;
    const totalShippingLabelsDetected = allPages.filter(page => !page.isPackingSlip).length;

    // Second pass: match packing slips to labels by customer name and postcode
    const groups = matchPackingSlipsToLabels(allPages);

    console.log('Matched groups:', groups.length);

    const orphanedSlips = groups
      .filter(group => group.shippingLabel === null)
      .flatMap(group => group.packingSlips.map(slip => ({
        pageNumber: slip.pageNumber,
        orderNumber: slip.orderNumber,
        customerName: slip.customerName,
        postcode: slip.postcode,
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

export const matchPackingSlipsToLabels = (
  pages: Array<{
    pageNumber: number;
    isPackingSlip: boolean;
    orderNumber: string | null;
    customerName: string | null;
    postcode: string | null;
  }>
): PackingSlipGroup[] => {
  const packingSlips: PackingSlip[] = pages
    .filter(page => page.isPackingSlip)
    .map(page => ({
      pageNumber: page.pageNumber,
      orderNumber: page.orderNumber || 'UNKNOWN',
      customerName: page.customerName,
      postcode: page.postcode,
    }));

  const shippingLabels: ShippingLabel[] = pages
    .filter(page => !page.isPackingSlip)
    .map(page => ({
      pageNumber: page.pageNumber,
      customerName: page.customerName,
      postcode: page.postcode,
    }));

  const groups: PackingSlipGroup[] = [];
  const usedLabelIndices = new Set<number>();

  for (const slip of packingSlips) {
    let bestMatchIndex = -1;
    let bestMatchScore = 0;

    for (let i = 0; i < shippingLabels.length; i++) {
      if (usedLabelIndices.has(i)) continue;

      const label = shippingLabels[i];
      let score = 0;

      if (slip.customerName && label.customerName) {
        if (slip.customerName === label.customerName) {
          score += 100;

          if (slip.postcode && label.postcode && slip.postcode === label.postcode) {
            score += 50;
          }
        }
      } else if (!label.customerName) {
        const pageDistance = Math.abs(label.pageNumber - slip.pageNumber);
        if (pageDistance === 1) {
          score += 50;
        } else if (pageDistance <= 3) {
          score += 20;
        }
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex >= 0 && (bestMatchScore >= 100 || bestMatchScore >= 50)) {
      const matchedLabel = shippingLabels[bestMatchIndex];
      usedLabelIndices.add(bestMatchIndex);

      const existingGroupIndex = groups.findIndex(
        g =>
          g.shippingLabel?.pageNumber === matchedLabel.pageNumber &&
          g.orderNumber === slip.orderNumber
      );

      if (existingGroupIndex >= 0) {
        groups[existingGroupIndex].packingSlips.push(slip);
      } else {
        groups.push({
          orderNumber: slip.orderNumber,
          packingSlips: [slip],
          shippingLabel: matchedLabel,
        });
      }

      console.log(
        `Matched packing slip page ${slip.pageNumber} (${slip.customerName}, ${slip.postcode}) with label page ${matchedLabel.pageNumber} (score: ${bestMatchScore})`
      );
    } else {
      groups.push({
        orderNumber: slip.orderNumber,
        packingSlips: [slip],
        shippingLabel: null,
      });
      console.log(
        `No match found for packing slip page ${slip.pageNumber} (${slip.customerName}, ${slip.postcode})`
      );
    }
  }

  const unusedLabels = shippingLabels.filter((_, i) => !usedLabelIndices.has(i));
  if (unusedLabels.length > 0) {
    console.log(`Warning: ${unusedLabels.length} shipping labels were not matched to any packing slips`);
    unusedLabels.forEach(label => {
      console.log(`  Unmatched label page ${label.pageNumber} (${label.customerName}, ${label.postcode})`);
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
