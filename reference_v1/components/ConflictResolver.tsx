'use client';

import { useState, useEffect } from 'react';
import { ConflictResult, ConflictType, ResolutionStrategy, generateConflictMarkers, parseConflictMarkers } from '@/lib/conflict-detector';

interface ConflictResolverProps {
  isVisible: boolean;
  onClose: () => void;
  onResolve: (resolvedContent: string, strategy: ResolutionStrategy) => void;
  conflictData: {
    filePath: string;
    localContent: string;
    remoteContent: string;
    baseContent?: string;
    conflictResult: ConflictResult;
  } | null;
}

type ViewMode = 'side-by-side' | 'unified';

export default function ConflictResolver({
  isVisible,
  onClose,
  onResolve,
  conflictData
}: ConflictResolverProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [resolution, setResolution] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy | null>(null);
  const [manualEdit, setManualEdit] = useState<string>('');

  useEffect(() => {
    if (conflictData) {
      // デフォルトで競合マーカー付きのコンテンツを設定
      const conflictMarkers = generateConflictMarkers(
        conflictData.localContent,
        conflictData.remoteContent,
        conflictData.filePath
      );
      setManualEdit(conflictMarkers);
      setResolution(conflictMarkers);
      setSelectedStrategy(null);
    }
  }, [conflictData]);

  if (!isVisible || !conflictData) return null;

  const handleStrategySelect = (strategy: ResolutionStrategy) => {
    setSelectedStrategy(strategy);

    switch (strategy) {
      case ResolutionStrategy.ACCEPT_LOCAL:
        setResolution(conflictData.localContent);
        break;
      case ResolutionStrategy.ACCEPT_REMOTE:
        setResolution(conflictData.remoteContent);
        break;
      case ResolutionStrategy.MANUAL_MERGE:
        setResolution(manualEdit);
        break;
    }
  };

  const handleResolve = () => {
    if (!selectedStrategy) return;

    onResolve(resolution, selectedStrategy);
    onClose();
  };

  const handleManualEditChange = (value: string) => {
    setManualEdit(value);
    if (selectedStrategy === ResolutionStrategy.MANUAL_MERGE) {
      setResolution(value);
    }
  };

  const conflictMarkers = parseConflictMarkers(manualEdit);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Merge Conflicts</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {conflictData.filePath}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                conflictData.conflictResult.type === ConflictType.CONFLICT
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {conflictData.conflictResult.description}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'side-by-side'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'unified'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unified
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Resolution Strategy:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleStrategySelect(ResolutionStrategy.ACCEPT_LOCAL)}
                className={`px-3 py-1 text-sm rounded border ${
                  selectedStrategy === ResolutionStrategy.ACCEPT_LOCAL
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Accept Local
              </button>
              <button
                onClick={() => handleStrategySelect(ResolutionStrategy.ACCEPT_REMOTE)}
                className={`px-3 py-1 text-sm rounded border ${
                  selectedStrategy === ResolutionStrategy.ACCEPT_REMOTE
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Accept Remote
              </button>
              <button
                onClick={() => handleStrategySelect(ResolutionStrategy.MANUAL_MERGE)}
                className={`px-3 py-1 text-sm rounded border ${
                  selectedStrategy === ResolutionStrategy.MANUAL_MERGE
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Manual Merge
              </button>
            </div>
            {conflictMarkers.hasConflicts && (
              <span className="text-sm text-orange-600 font-medium">
                ⚠️ {conflictMarkers.conflicts.length} unresolved conflict{conflictMarkers.conflicts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'side-by-side' ? (
            <div className="h-full grid grid-cols-3 gap-2 p-4">
              {/* Local Changes */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-green-700">Local Changes</h3>
                  <span className="text-xs text-gray-500">Your edits</span>
                </div>
                <div className="flex-1 border border-green-200 rounded-md overflow-hidden">
                  <textarea
                    value={conflictData.localContent}
                    readOnly
                    className="w-full h-full p-3 font-mono text-sm bg-green-50 resize-none border-none outline-none"
                  />
                </div>
              </div>

              {/* Remote Changes */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-700">Remote Changes</h3>
                  <span className="text-xs text-gray-500">GitHub version</span>
                </div>
                <div className="flex-1 border border-blue-200 rounded-md overflow-hidden">
                  <textarea
                    value={conflictData.remoteContent}
                    readOnly
                    className="w-full h-full p-3 font-mono text-sm bg-blue-50 resize-none border-none outline-none"
                  />
                </div>
              </div>

              {/* Resolution */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-purple-700">Resolution</h3>
                  {selectedStrategy && (
                    <span className="text-xs text-gray-500">
                      {selectedStrategy === ResolutionStrategy.ACCEPT_LOCAL && 'Local version'}
                      {selectedStrategy === ResolutionStrategy.ACCEPT_REMOTE && 'Remote version'}
                      {selectedStrategy === ResolutionStrategy.MANUAL_MERGE && 'Manual edit'}
                    </span>
                  )}
                </div>
                <div className="flex-1 border border-purple-200 rounded-md overflow-hidden">
                  {selectedStrategy === ResolutionStrategy.MANUAL_MERGE ? (
                    <textarea
                      value={manualEdit}
                      onChange={(e) => handleManualEditChange(e.target.value)}
                      className="w-full h-full p-3 font-mono text-sm bg-purple-50 resize-none border-none outline-none"
                      placeholder="Edit the content manually to resolve conflicts..."
                    />
                  ) : (
                    <textarea
                      value={resolution}
                      readOnly
                      className="w-full h-full p-3 font-mono text-sm bg-purple-50 resize-none border-none outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Unified View */
            <div className="h-full p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Unified Diff View</h3>
                <span className="text-xs text-gray-500">Manual editing</span>
              </div>
              <div className="h-full border border-gray-200 rounded-md overflow-hidden">
                <textarea
                  value={manualEdit}
                  onChange={(e) => {
                    handleManualEditChange(e.target.value);
                    setSelectedStrategy(ResolutionStrategy.MANUAL_MERGE);
                  }}
                  className="w-full h-full p-3 font-mono text-sm bg-white resize-none border-none outline-none"
                  placeholder="Edit the content manually to resolve conflicts..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
              <span>Local</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded"></div>
              <span>Remote</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-200 border border-purple-300 rounded"></div>
              <span>Resolution</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!selectedStrategy || (selectedStrategy === ResolutionStrategy.MANUAL_MERGE && conflictMarkers.hasConflicts)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resolve Conflict
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}