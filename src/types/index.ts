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
}

export interface LabelCandidate {
  label: ShippingLabel;
  score: number;
  matchReasons: string[];
}

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

export interface PackingSlipGroup {
  orderNumber: string;
  packingSlips: PackingSlip[];
  shippingLabel: ShippingLabel | null;
  matchConfidence?: MatchConfidence;
  labelCandidates?: LabelCandidate[];
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

export interface UncertainMatch {
  group: PackingSlipGroup;
  candidates: LabelCandidate[];
}

export interface AnalysisResult {
  groups: PackingSlipGroup[];
  orphanedSlips: OrphanedPackingSlip[];
  uncertainMatches: UncertainMatch[];
  totalPackingSlipsDetected: number;
  totalShippingLabelsDetected: number;
}
