import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  currentStep: string;
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, progress }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <Loader2 className="w-6 h-6 text-blue-500 mr-2 animate-spin" />
        <h2 className="text-xl font-semibold text-gray-800">Processing PDF</h2>
      </div>

      <div className="mb-2">
        <p className="text-sm text-gray-600 mb-2">{currentStep}</p>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 text-right">{progress}%</p>
    </div>
  );
};
