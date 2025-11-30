import * as pdfjsLib from 'pdfjs-dist';
import { PackingSlip, ShippingLabel, PackingSlipGroup, ProcessedOrder, AnalysisResult, NonStandardServiceLabel } from '../types';
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
  if (text.includes('Packing slip')) {
    return false;
  }
  return true;
};

export const extractShippingService = (text: string): string | null => {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('2nd class')) return '2nd Class';
  if (lowerText.includes('1st class')) return '1st Class';
  if (lowerText.includes('tracked 24')) return 'Tracked 24';
  if (lowerText.includes('tracked 48')) return 'Tracked 48';
  if (lowerText.includes('special delivery')) return 'Special Delivery';
  if (lowerText.includes('signed for')) return 'Signed For';

  return null;
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
      service: string | null;
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
        allPages.push({ pageNumber: i, isPackingSlip: true, orderNumber, customerName, postcode, service: null });
      } else {
        const customerName = extractCustomerNameFromShippingLabel(text);
        const service = extractShippingService(text);
        console.log(`Page ${i}: Shipping label, customer: ${customerName}, postcode: ${postcode}, service: ${service}`);
        allPages.push({ pageNumber: i, isPackingSlip: false, orderNumber: null, customerName, postcode, service });
      }
    }

    const totalPackingSlipsDetected = allPages.filter(page => page.isPackingSlip).length;
    const totalShippingLabelsDetected = allPages.filter(page => !page.isPackingSlip).length;

    const groups = sequentialMatchPackingSlipsToLabels(allPages);

    console.log('Matched groups:', groups.length);

    const orphanedSlips = groups
      .filter(group => group.shippingLabel === null)
      .flatMap(group => group.packingSlips.map(slip => ({
        pageNumber: slip.pageNumber,
        orderNumber: slip.orderNumber,
        customerName: slip.customerName,
        postcode: slip.postcode,
      })));

    const nonStandardServiceLabels: NonStandardServiceLabel[] = groups
      .filter(group =>
        group.shippingLabel !== null &&
        group.shippingLabel.service !== null &&
        group.shippingLabel.service !== '2nd Class'
      )
      .map(group => ({
        orderNumber: group.orderNumber,
        pageNumber: group.shippingLabel!.pageNumber,
        service: group.shippingLabel!.service!,
      }));

    console.log(`Found ${orphanedSlips.length} orphaned slips and ${nonStandardServiceLabels.length} non-standard service labels`);

    return {
      groups,
      orphanedSlips,
      nonStandardServiceLabels,
      totalPackingSlipsDetected,
      totalShippingLabelsDetected
    };
  } catch (error) {
    console.error('Error in analyzePDF:', error);
    throw new Error(`Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const sequentialMatchPackingSlipsToLabels = (
  pages: Array<{
    pageNumber: number;
    isPackingSlip: boolean;
    orderNumber: string | null;
    customerName: string | null;
    postcode: string | null;
    service: string | null;
  }>
): PackingSlipGroup[] => {
  const groups: PackingSlipGroup[] = [];
  let i = 0;

  while (i < pages.length) {
    const page = pages[i];

    if (page.isPackingSlip) {
      const orderNumber = page.orderNumber || 'UNKNOWN';
      const packingSlips: PackingSlip[] = [{
        pageNumber: page.pageNumber,
        orderNumber,
        customerName: page.customerName,
        postcode: page.postcode,
      }];

      let j = i + 1;
      while (j < pages.length && pages[j].isPackingSlip && pages[j].orderNumber === orderNumber) {
        packingSlips.push({
          pageNumber: pages[j].pageNumber,
          orderNumber: pages[j].orderNumber || 'UNKNOWN',
          customerName: pages[j].customerName,
          postcode: pages[j].postcode,
        });
        j++;
      }

      if (j < pages.length && !pages[j].isPackingSlip) {
        const labelPage = pages[j];
        const shippingLabel: ShippingLabel = {
          pageNumber: labelPage.pageNumber,
          customerName: labelPage.customerName,
          postcode: labelPage.postcode,
          service: labelPage.service,
        };

        groups.push({
          orderNumber,
          packingSlips,
          shippingLabel,
        });

        console.log(`Sequential match: Order ${orderNumber} with ${packingSlips.length} packing slip(s) matched to label on page ${labelPage.pageNumber} (service: ${labelPage.service})`);
        i = j + 1;
      } else {
        groups.push({
          orderNumber,
          packingSlips,
          shippingLabel: null,
        });

        console.log(`Orphaned: Order ${orderNumber} with ${packingSlips.length} packing slip(s) has no shipping label`);
        i = j;
      }
    } else {
      console.log(`Unmatched shipping label on page ${page.pageNumber}`);
      i++;
    }
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
