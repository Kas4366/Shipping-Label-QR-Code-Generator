import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { OrphanedPackingSlip } from '../types';

interface WarningDialogProps {
  orphanedSlips: OrphanedPackingSlip[];
  onCancel: () => void;
  onProceed: () => void;
}

export const WarningDialog: React.FC<WarningDialogProps> = ({
  orphanedSlips,
  onCancel,
  onProceed,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mr-3" />
              <h2 className="text-2xl font-bold text-amber-900">
                Missing Shipping Labels Detected
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
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              The system found <span className="font-bold text-amber-700">{orphanedSlips.length}</span> packing slip{orphanedSlips.length > 1 ? 's' : ''} without corresponding shipping labels:
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-3">
              Affected Order Numbers:
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What does this mean?</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
              <li>These orders have packing slips but no shipping labels in the PDF</li>
              <li>QR codes can only be generated for orders with shipping labels</li>
              <li>The affected orders will be excluded from the output PDF</li>
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
