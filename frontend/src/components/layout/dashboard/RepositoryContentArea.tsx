import React from 'react'
import { FolderOpen } from 'lucide-react'
import { Repository } from '@/lib/github'

interface RepositoryContentAreaProps {
  selectedRepo: Repository | null
  fileCount: number
}

export function RepositoryContentArea({
  selectedRepo,
  fileCount,
}: RepositoryContentAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {!selectedRepo && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              リポジトリを選択してください
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              上部のドロップダウンからリポジトリを選択すると、ファイルツリーが表示されます
            </p>
          </div>
        </div>
      )}

      {selectedRepo && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedRepo.full_name}
          </h3>
          {selectedRepo.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {selectedRepo.description}
            </p>
          )}
          <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            {selectedRepo.language && <span>{selectedRepo.language}</span>}
            <span>⭐ {selectedRepo.stargazers_count}</span>
            {selectedRepo.updated_at && (
              <span>
                更新:{' '}
                {new Date(selectedRepo.updated_at).toLocaleDateString('ja-JP')}
              </span>
            )}
          </div>
          <div className="mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ファイル総数: {fileCount}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
