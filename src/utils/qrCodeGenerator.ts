import QRCode from 'qrcode';

export const generateQRCode = async (
  orderNumber: string
): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(orderNumber, {
      width: 60,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`);
  }
};

export const formatDateTime = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const formatDateForFilename = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  return `${day}/${month}/${year}`;
};
