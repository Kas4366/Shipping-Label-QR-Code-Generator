import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        disabled
          ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
          : 'border-blue-400 bg-blue-50 hover:border-blue-500 hover:bg-blue-100 cursor-pointer'
      }`}
    >
      <Upload className={`w-16 h-16 mx-auto mb-4 ${disabled ? 'text-gray-400' : 'text-blue-500'}`} />
      <h3 className={`text-xl font-semibold mb-2 ${disabled ? 'text-gray-500' : 'text-gray-800'}`}>
        {disabled ? 'Processing...' : 'Upload Packing Slip PDF'}
      </h3>
      <p className={`mb-4 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
        Drag and drop your PDF file here, or click to browse
      </p>
      <label className={`inline-block px-6 py-3 rounded-lg font-medium transition-colors ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
      }`}>
        Choose File
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />
      </label>
    </div>
  );
};
