import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { OrphanedPackingSlip, NonStandardServiceLabel } from '../types';

interface WarningDialogProps {
  orphanedSlips: OrphanedPackingSlip[];
  nonStandardServiceLabels: NonStandardServiceLabel[];
  onCancel: () => void;
  onProceed: () => void;
}

export const WarningDialog: React.FC<WarningDialogProps> = ({
  orphanedSlips,
  nonStandardServiceLabels,
  onCancel,
  onProceed,
}) => {
  const hasOrphanedSlips = orphanedSlips.length > 0;
  const hasNonStandardServices = nonStandardServiceLabels.length > 0;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mr-3" />
              <h2 className="text-2xl font-bold text-amber-900">
                {hasOrphanedSlips && hasNonStandardServices
                  ? 'Issues Detected in PDF'
                  : hasOrphanedSlips
                  ? 'Missing Shipping Labels Detected'
                  : 'Non-Standard Shipping Services Detected'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {hasOrphanedSlips && (
            <div className="mb-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  The system found <span className="font-bold text-amber-700">{orphanedSlips.length}</span> packing slip{orphanedSlips.length > 1 ? 's' : ''} without corresponding shipping labels:
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-3">
                  Missing Labels for Orders:
                </h3>
                <div className="space-y-2">
                  {orphanedSlips.map((slip, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white rounded px-4 py-2 border border-amber-200"
                    >
                      <span className="font-medium text-gray-900">
                        Order #{slip.orderNumber}
                      </span>
                      <span className="text-sm text-gray-600">
                        Page {slip.pageNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasNonStandardServices && (
            <div className="mb-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  The system found <span className="font-bold text-blue-700">{nonStandardServiceLabels.length}</span> shipping label{nonStandardServiceLabels.length > 1 ? 's' : ''} with non-standard service types:
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Non-Standard Service Labels:
                </h3>
                <div className="space-y-2">
                  {nonStandardServiceLabels.map((label, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white rounded px-4 py-2 border border-blue-200"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          Order #{label.orderNumber}
                        </span>
                        <span className="text-sm text-blue-700 font-semibold">
                          Service: {label.service}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        Page {label.pageNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">What does this mean?</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
              {hasOrphanedSlips && (
                <>
                  <li>Orders with missing labels have packing slips but no shipping labels in the PDF</li>
                  <li>QR codes can only be generated for orders with shipping labels</li>
                  <li>These orders will be excluded from the output PDF</li>
                </>
              )}
              {hasNonStandardServices && (
                <>
                  <li>Labels with services other than "2nd Class" were detected</li>
                  <li>These may require special handling or different postage rates</li>
                  <li>Review these orders before proceeding</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex gap-4 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Cancel & Review
            </button>
            <button
              onClick={onProceed}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
