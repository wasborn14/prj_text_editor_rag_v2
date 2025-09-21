'use client';

import { useState } from 'react';

interface SyncModalProps {
  repositoryName: string;
  repositoryId: string;
  onSyncComplete: (result: { success: boolean; filesCount: number }) => void;
  onClose: () => void;
}

export default function SyncModal({ repositoryName, repositoryId, onSyncComplete, onClose }: SyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ message: '', current: 0, total: 100 });
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    setProgress({ message: 'Starting sync...', current: 0, total: 100 });

    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      setProgress({ message: 'Sync completed!', current: 100, total: 100 });

      setTimeout(() => {
        onSyncComplete(result);
      }, 1000);
    } catch (error: any) {
      console.error('Sync error:', error);
      setError(error.message || 'Failed to sync repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Sync Repository
            </h2>
            {!isLoading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {!isLoading && !error && (
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to sync</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will import all Markdown files from <strong>{repositoryName}</strong> into your workspace.
                </p>
                <p className="text-xs text-gray-500">
                  This process may take a few moments depending on the repository size.
                </p>
              </div>
              <button
                onClick={handleSync}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Start Sync
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Syncing...</h3>
                <p className="text-sm text-gray-600 mb-4">{progress.message}</p>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>

                <p className="text-xs text-gray-500">
                  Please don't close this window...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-red-900 mb-2">Sync Failed</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSync}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}