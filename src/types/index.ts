export interface PackingSlip {
  pageNumber: number;
  orderNumber: string;
}

export interface ShippingLabel {
  pageNumber: number;
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
}

export interface AnalysisResult {
  groups: PackingSlipGroup[];
  orphanedSlips: OrphanedPackingSlip[];
  totalPackingSlipsDetected: number;
  totalShippingLabelsDetected: number;
}
