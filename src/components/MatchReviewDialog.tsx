import { useState } from 'react';
import { UncertainMatch, LabelCandidate, ShippingLabel } from '../types';
import { X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface MatchReviewDialogProps {
  uncertainMatches: UncertainMatch[];
  onConfirm: (groupIndex: number, selectedLabel: ShippingLabel) => void;
  onSkip: (groupIndex: number) => void;
  onComplete: () => void;
}

export function MatchReviewDialog({
  uncertainMatches,
  onConfirm,
  onSkip,
  onComplete,
}: MatchReviewDialogProps) {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);

  if (uncertainMatches.length === 0) {
    return null;
  }

  const currentMatch = uncertainMatches[currentMatchIndex];
  const slip = currentMatch.group.packingSlips[0];
  const currentLabel = currentMatch.group.shippingLabel;
  const candidates = currentMatch.candidates;

  const handleConfirm = () => {
    const selectedLabel = candidates[selectedCandidateIndex]?.label || currentLabel;
    if (selectedLabel) {
      onConfirm(currentMatchIndex, selectedLabel);
    }
    moveToNext();
  };

  const handleSkip = () => {
    onSkip(currentMatchIndex);
    moveToNext();
  };

  const moveToNext = () => {
    if (currentMatchIndex < uncertainMatches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
      setSelectedCandidateIndex(0);
    } else {
      onComplete();
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-orange-100 text-orange-800',
      unmatched: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[confidence as keyof typeof styles] || styles.unmatched}`}>
        {confidence.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review Uncertain Matches</h2>
            <p className="text-sm text-gray-600 mt-1">
              Match {currentMatchIndex + 1} of {uncertainMatches.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getConfidenceBadge(currentMatch.group.matchConfidence || 'unmatched')}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Packing Slip (Page {slip.pageNumber})
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Order:</span>{' '}
                  <span className="text-gray-900">{currentMatch.group.orderNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Customer:</span>{' '}
                  <span className="text-gray-900">{slip.customerName || 'Not extracted'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Postcode:</span>{' '}
                  <span className="text-gray-900">{slip.postcode || 'Not extracted'}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Current Match (Page {currentLabel?.pageNumber || 'N/A'})
              </h3>
              {currentLabel ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Customer:</span>{' '}
                    <span className="text-gray-900">{currentLabel.customerName || 'Not extracted'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Postcode:</span>{' '}
                    <span className="text-gray-900">{currentLabel.postcode || 'Not extracted'}</span>
                  </div>
                  {candidates[0] && (
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <div className="text-xs font-medium text-green-900 mb-1">Match Reasons:</div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {candidates[0].matchReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs text-gray-600 mt-2">Score: {candidates[0].score}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No match found</p>
              )}
            </div>
          </div>

          {candidates.length > 1 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Alternative Shipping Labels</h3>
              <div className="space-y-2">
                {candidates.slice(0, 5).map((candidate, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedCandidateIndex(idx)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedCandidateIndex === idx
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={selectedCandidateIndex === idx}
                          onChange={() => setSelectedCandidateIndex(idx)}
                          className="w-4 h-4"
                        />
                        <span className="font-medium text-gray-900">Page {candidate.label.pageNumber}</span>
                        {idx === 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Best Match
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Score: {candidate.score}</span>
                    </div>
                    <div className="text-sm text-gray-700 ml-6">
                      <div>Customer: {candidate.label.customerName || 'Not extracted'}</div>
                      <div>Postcode: {candidate.label.postcode || 'Not extracted'}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Reasons: {candidate.matchReasons.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Skip This Match
            </button>
            <button
              onClick={handleConfirm}
              disabled={candidates.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Confirm Match
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentMatchIndex + 1) / uncertainMatches.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
