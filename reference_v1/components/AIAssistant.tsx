'use client';

import React, { useEffect, useState } from 'react';

interface AIAssistantProps {
  originalContent: string;
  suggestions: any;
  onAccept: (content: string) => void;
  onClose: () => void;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  originalContent,
  suggestions,
  onAccept,
  onClose,
}) => {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (suggestions?.suggestedContent) {
      const diff = createSimpleDiff(originalContent, suggestions.suggestedContent);
      setDiffLines(diff);
      setIsLoading(false);
    }
  }, [originalContent, suggestions]);

  const createSimpleDiff = (original: string, suggested: string): DiffLine[] => {
    const originalLines = original.split('\n');
    const suggestedLines = suggested.split('\n');
    const diff: DiffLine[] = [];

    const maxLines = Math.max(originalLines.length, suggestedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i];
      const suggLine = suggestedLines[i];

      if (origLine === suggLine) {
        if (origLine !== undefined) {
          diff.push({ type: 'unchanged', content: origLine });
        }
      } else {
        if (origLine !== undefined && suggLine === undefined) {
          diff.push({ type: 'removed', content: origLine });
        } else if (origLine === undefined && suggLine !== undefined) {
          diff.push({ type: 'added', content: suggLine });
        } else if (origLine !== suggLine) {
          if (origLine) diff.push({ type: 'removed', content: origLine });
          if (suggLine) diff.push({ type: 'added', content: suggLine });
        }
      }
    }

    return diff;
  };

  const handleAcceptAll = () => {
    if (suggestions?.suggestedContent) {
      onAccept(suggestions.suggestedContent);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">AI Suggestions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : suggestions?.error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded-lg">
              Error: {suggestions.error}
            </div>
          ) : (
            <>
              {/* Summary */}
              {suggestions?.summary && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Summary of Changes</h3>
                  <p className="text-blue-700">{suggestions.summary}</p>
                </div>
              )}

              {/* Diff View */}
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <div className="space-y-1">
                  {diffLines.map((line, index) => (
                    <div
                      key={index}
                      className={`px-2 py-1 ${
                        line.type === 'added'
                          ? 'bg-green-100 text-green-800'
                          : line.type === 'removed'
                          ? 'bg-red-100 text-red-800'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="select-none mr-2">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      {line.content || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !suggestions?.error && (
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
            >
              Accept All Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;