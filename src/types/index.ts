export interface PackingSlip {
  pageNumber: number;
  orderNumber: string;
  customerName: string | null;
  postcode: string | null;
}

export interface ShippingLabel {
  pageNumber: number;
  customerName: string | null;
  postcode: string | null;
  service: string | null;
}


export interface PackingSlipGroup {
  orderNumber: string;
  packingSlips: PackingSlip[];
  shippingLabel: ShippingLabel | null;
}

export interface ProcessedOrder {
  orderNumber: string;
  packingSlips: PackingSlip[];
  shippingLabel: ShippingLabel;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  error?: string;
}

export interface OrphanedPackingSlip {
  pageNumber: number;
  orderNumber: string;
  customerName: string | null;
  postcode: string | null;
}

export interface NonStandardServiceLabel {
  orderNumber: string;
  pageNumber: number;
  service: string;
}

export interface AnalysisResult {
  groups: PackingSlipGroup[];
  orphanedSlips: OrphanedPackingSlip[];
  nonStandardServiceLabels: NonStandardServiceLabel[];
  totalPackingSlipsDetected: number;
  totalShippingLabelsDetected: number;
}
