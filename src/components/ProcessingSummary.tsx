import React from 'react';
import { ProcessedOrder, OrphanedPackingSlip } from '../types';
import { CheckCircle, Package, FileText, AlertTriangle, ScanLine } from 'lucide-react';

interface ProcessingSummaryProps {
  orders: ProcessedOrder[];
  orphanedSlips?: OrphanedPackingSlip[];
  totalPackingSlipsDetected: number;
  totalShippingLabelsDetected: number;
}

export const ProcessingSummary: React.FC<ProcessingSummaryProps> = ({
  orders,
  orphanedSlips = [],
  totalPackingSlipsDetected,
  totalShippingLabelsDetected
}) => {
  const totalPackingSlipsMatched = orders.reduce(
    (sum, order) => sum + order.packingSlips.length,
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Analysis Complete</h2>
      </div>

      <div className="mb-6">
        <div className="flex items-center mb-3">
          <ScanLine className="w-5 h-5 text-gray-700 mr-2" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Detected</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center mb-2">
              <FileText className="w-5 h-5 text-slate-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Packing Slips</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">{totalPackingSlipsDetected}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center mb-2">
              <Package className="w-5 h-5 text-slate-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Shipping Labels</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">{totalShippingLabelsDetected}</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center mb-3">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Successfully Matched</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Packing Slips</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalPackingSlipsMatched}</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Package className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Shipping Labels</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{orders.length}</p>
          </div>

          <div className="bg-teal-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-5 h-5 text-teal-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Unique Orders</span>
            </div>
            <p className="text-2xl font-bold text-teal-600">{orders.length}</p>
          </div>
        </div>
      </div>

      {orphanedSlips.length > 0 && (
        <div className="border-t pt-4 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  Missing Shipping Labels
                </h3>
                <p className="text-sm text-amber-800">
                  {orphanedSlips.length} packing slip{orphanedSlips.length > 1 ? 's' : ''} found without corresponding shipping labels
                </p>
              </div>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {orphanedSlips.map((slip, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-amber-900">
                    Order #{slip.orderNumber}
                  </span>
                  <span className="text-xs text-amber-700">
                    Page {slip.pageNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-700 mb-3">Order Details:</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {orders.map((order, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
            >
              <span className="text-sm font-medium text-gray-700">
                Order #{order.orderNumber}
              </span>
              <span className="text-xs text-gray-500">
                {order.packingSlips.length} packing slip{order.packingSlips.length > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
