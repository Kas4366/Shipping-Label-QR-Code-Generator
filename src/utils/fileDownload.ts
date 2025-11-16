import { formatDateForFilename } from './qrCodeGenerator';

export const downloadPDF = (pdfBytes: Uint8Array, pageCount: number): void => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `QR output ${formatDateForFilename()}-(${pageCount}).pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
