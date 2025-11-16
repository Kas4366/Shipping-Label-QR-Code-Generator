import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ProcessedOrder } from '../types';
import { generateQRCode, formatDateTime } from './qrCodeGenerator';

export const addQRCodeToLabel = async (
  pdfDoc: PDFDocument,
  pageIndex: number,
  orderNumber: string,
  totalPages: number
): Promise<void> => {
  const page = pdfDoc.getPage(pageIndex);
  const { width } = page.getSize();

  const qrCodeDataURL = await generateQRCode(orderNumber);
  const qrCodeImageBytes = await fetch(qrCodeDataURL).then((res) =>
    res.arrayBuffer()
  );
  const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);

  const qrSize = 30;
  const margin = 30;
  const cmInPoints = 28.35;
  const qrX = width - qrSize - margin - cmInPoints;
  const qrY = margin + cmInPoints;

  page.drawImage(qrCodeImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 7;
  const textColor = rgb(0, 0, 0);

  const orderNumberText = `Order: ${orderNumber}`;
  const orderNumberWidth = font.widthOfTextAtSize(orderNumberText, fontSize);
  const orderNumberX = qrX + (qrSize - orderNumberWidth) / 2;
  const orderNumberY = qrY - 10;

  page.drawText(orderNumberText, {
    x: orderNumberX,
    y: orderNumberY,
    size: fontSize,
    font,
    color: textColor,
  });

  const dateTimeText = formatDateTime();
  const dateTimeWidth = font.widthOfTextAtSize(dateTimeText, fontSize);
  const dateTimeX = qrX + (qrSize - dateTimeWidth) / 2;
  const dateTimeY = orderNumberY - 10;

  page.drawText(dateTimeText, {
    x: dateTimeX,
    y: dateTimeY,
    size: fontSize,
    font,
    color: textColor,
  });

  const pageNumberText = `${pageIndex + 1}/${totalPages}`;
  const pageNumberX = margin;
  const pageNumberY = margin;

  page.drawText(pageNumberText, {
    x: pageNumberX,
    y: pageNumberY,
    size: fontSize,
    font,
    color: textColor,
  });
};

export const createEnhancedPDF = async (
  originalPdfFile: File,
  orders: ProcessedOrder[]
): Promise<Uint8Array> => {
  const arrayBuffer = await originalPdfFile.arrayBuffer();
  const originalPdf = await PDFDocument.load(arrayBuffer);

  const newPdf = await PDFDocument.create();

  const labelPageNumbers = orders.map((order) => order.shippingLabel.pageNumber - 1);

  for (let i = 0; i < labelPageNumbers.length; i++) {
    const pageIndex = labelPageNumbers[i];
    const [copiedPage] = await newPdf.copyPages(originalPdf, [pageIndex]);
    newPdf.addPage(copiedPage);
  }

  for (let i = 0; i < orders.length; i++) {
    await addQRCodeToLabel(
      newPdf,
      i,
      orders[i].orderNumber,
      orders.length
    );
  }

  return await newPdf.save();
};
