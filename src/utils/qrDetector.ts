import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';

export const detectQRCode = async (page: pdfjsLib.PDFPageProxy): Promise<boolean> => {
  try {
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Could not get canvas context');
      return false;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      console.log('QR code detected:', code.data);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error detecting QR code:', error);
    return false;
  }
};

export const detectRoyalMailLogo = (text: string): boolean => {
  const royalMailIndicators = [
    'Royal Mail',
    'ROYAL MAIL',
    'royal mail',
  ];

  return royalMailIndicators.some(indicator =>
    text.includes(indicator)
  );
};

export const detectDeliveredBy = (text: string): boolean => {
  const patterns = [
    /Delivered\s+by/i,
    /Delivered by:/i,
  ];

  return patterns.some(pattern => pattern.test(text));
};

export const detectPostageIndicator = (text: string): boolean => {
  const patterns = [
    /Postage\s+on\s+Account/i,
    /Postage\s+paid\s+GB/i,
    /Postage\s+paid\s+by\s+GB/i,
  ];

  return patterns.some(pattern => pattern.test(text));
};

export const isRoyalMailShippingLabel = (text: string): boolean => {
  const hasDeliveredBy = detectDeliveredBy(text);
  const hasRoyalMail = detectRoyalMailLogo(text);
  const hasPostageIndicator = detectPostageIndicator(text);

  console.log('Label detection criteria:');
  console.log('  - Delivered by:', hasDeliveredBy);
  console.log('  - Royal Mail:', hasRoyalMail);
  console.log('  - Postage indicator:', hasPostageIndicator);

  // All three criteria must be present
  return hasDeliveredBy && hasRoyalMail && hasPostageIndicator;
};
