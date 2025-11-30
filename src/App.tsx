import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProcessingSummary } from './components/ProcessingSummary';
import { ProgressBar } from './components/ProgressBar';
import { WarningDialog } from './components/WarningDialog';
import { ProcessedOrder, ProcessingStatus, OrphanedPackingSlip, NonStandardServiceLabel } from './types';
import { analyzePDF, convertGroupsToOrders } from './utils/pdfParser';
import { createEnhancedPDF } from './utils/pdfModifier';
import { downloadPDF } from './utils/fileDownload';
import { Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [orders, setOrders] = useState<ProcessedOrder[]>([]);
  const [orphanedSlips, setOrphanedSlips] = useState<OrphanedPackingSlip[]>([]);
  const [nonStandardServiceLabels, setNonStandardServiceLabels] = useState<NonStandardServiceLabel[]>([]);
  const [totalPackingSlipsDetected, setTotalPackingSlipsDetected] = useState(0);
  const [totalShippingLabelsDetected, setTotalShippingLabelsDetected] = useState(0);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [userConfirmedWarning, setUserConfirmedWarning] = useState(false);
  const [enhancedPDF, setEnhancedPDF] = useState<Uint8Array | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentStep: '',
    progress: 0,
  });

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setOrders([]);
    setOrphanedSlips([]);
    setNonStandardServiceLabels([]);
    setEnhancedPDF(null);
    setProcessingStatus({
      isProcessing: true,
      currentStep: 'Analyzing PDF structure...',
      progress: 10,
      error: undefined,
    });

    try {
      console.log('Starting file analysis for:', file.name);
      const { groups, orphanedSlips, nonStandardServiceLabels, totalPackingSlipsDetected, totalShippingLabelsDetected } = await analyzePDF(file);

      console.log('Analysis complete:', { groups, orphanedSlips, nonStandardServiceLabels, totalPackingSlipsDetected, totalShippingLabelsDetected });

      setProcessingStatus({
        isProcessing: true,
        currentStep: 'Grouping orders sequentially...',
        progress: 40,
      });

      const processedOrders = convertGroupsToOrders(groups);
      console.log('Processed orders:', processedOrders);

      setOrders(processedOrders);
      setOrphanedSlips(orphanedSlips);
      setNonStandardServiceLabels(nonStandardServiceLabels);
      setTotalPackingSlipsDetected(totalPackingSlipsDetected);
      setTotalShippingLabelsDetected(totalShippingLabelsDetected);
      setUserConfirmedWarning(false);

      setProcessingStatus({
        isProcessing: false,
        currentStep: 'Analysis complete',
        progress: 100,
      });
    } catch (error) {
      console.error('PDF Processing Error Details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setSelectedFile(null);
      setOrders([]);
      setOrphanedSlips([]);
      setNonStandardServiceLabels([]);
      setTotalPackingSlipsDetected(0);
      setTotalShippingLabelsDetected(0);
      setProcessingStatus({
        isProcessing: false,
        currentStep: '',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to process PDF. Check console for details.',
      });
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedFile || orders.length === 0) return;

    if ((orphanedSlips.length > 0 || nonStandardServiceLabels.length > 0) && !userConfirmedWarning) {
      setShowWarningDialog(true);
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentStep: 'Generating QR codes...',
      progress: 30,
      error: undefined,
    });

    try {
      setProcessingStatus({
        isProcessing: true,
        currentStep: 'Creating enhanced PDF...',
        progress: 60,
      });

      const pdfBytes = await createEnhancedPDF(selectedFile, orders);
      setEnhancedPDF(pdfBytes);

      setProcessingStatus({
        isProcessing: true,
        currentStep: 'Finalizing document...',
        progress: 90,
      });

      setProcessingStatus({
        isProcessing: false,
        currentStep: 'PDF ready for download',
        progress: 100,
      });
    } catch (error) {
      setProcessingStatus({
        isProcessing: false,
        currentStep: '',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      });
    }
  };

  const handleDownload = () => {
    if (enhancedPDF) {
      downloadPDF(enhancedPDF, orders.length);
    }
  };


  const handleReset = () => {
    setSelectedFile(null);
    setOrders([]);
    setOrphanedSlips([]);
    setNonStandardServiceLabels([]);
    setTotalPackingSlipsDetected(0);
    setTotalShippingLabelsDetected(0);
    setShowWarningDialog(false);
    setUserConfirmedWarning(false);
    setEnhancedPDF(null);
    setProcessingStatus({
      isProcessing: false,
      currentStep: '',
      progress: 0,
      error: undefined,
    });
  };

  const handleWarningCancel = () => {
    setShowWarningDialog(false);
  };

  const handleWarningProceed = () => {
    setShowWarningDialog(false);
    setUserConfirmedWarning(true);
    handleGeneratePDF();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Shipping Label QR Code Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your packing slip PDF to automatically add QR codes to shipping labels
          </p>
        </div>

        {processingStatus.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">Error Processing PDF</h3>
                <p className="text-red-700">{processingStatus.error}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        )}

        {!selectedFile && (
          <FileUpload
            onFileSelect={handleFileSelect}
            disabled={processingStatus.isProcessing}
          />
        )}

        {processingStatus.isProcessing && !enhancedPDF && (
          <ProgressBar
            currentStep={processingStatus.currentStep}
            progress={processingStatus.progress}
          />
        )}

        {orders.length > 0 && !processingStatus.isProcessing && (
          <>
            <ProcessingSummary
              orders={orders}
              orphanedSlips={orphanedSlips}
              nonStandardServiceLabels={nonStandardServiceLabels}
              totalPackingSlipsDetected={totalPackingSlipsDetected}
              totalShippingLabelsDetected={totalShippingLabelsDetected}
            />
          </>
        )}

        {showWarningDialog && (
          <WarningDialog
            orphanedSlips={orphanedSlips}
            nonStandardServiceLabels={nonStandardServiceLabels}
            onCancel={handleWarningCancel}
            onProceed={handleWarningProceed}
          />
        )}

        {orders.length > 0 && !enhancedPDF && !processingStatus.isProcessing && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGeneratePDF}
              className="flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Download className="w-5 h-5 mr-2" />
              Generate QR Labels
            </button>
            <button
              onClick={handleReset}
              className="flex items-center px-8 py-4 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Upload New File
            </button>
          </div>
        )}

        {enhancedPDF && !processingStatus.isProcessing && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">PDF Ready!</h2>
              <p className="text-gray-600">
                Your enhanced shipping labels with QR codes are ready to download
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </button>
              <button
                onClick={handleReset}
                className="flex items-center px-8 py-4 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Process Another File
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>All processing happens locally in your browser. Your files never leave your device.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
