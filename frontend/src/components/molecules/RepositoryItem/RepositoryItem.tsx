import { GitHubRepository } from '@/types'

interface RepositoryItemProps {
  repository: GitHubRepository
  isSelected: boolean
  onSelect: (repository: GitHubRepository) => void
}

export default function RepositoryItem({
  repository,
  isSelected,
  onSelect,
}: RepositoryItemProps) {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={() => onSelect(repository)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <div
              className={`w-4 h-4 rounded-full border-2 mr-3 ${
                isSelected
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
              }`}
            >
              {isSelected && (
                <div className="w-2 h-2 bg-white rounded-full m-0.5" />
              )}
            </div>
            <div className="font-medium text-gray-900">
              {repository.fullName}
            </div>
          </div>
          {repository.description && (
            <div className="text-sm text-gray-600 mt-2 ml-7">
              {repository.description}
            </div>
          )}
          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2 ml-7">
            {repository.language && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                {repository.language}
              </span>
            )}
            <span>Branch: {repository.defaultBranch}</span>
            {repository.updatedAt && (
              <span>
                Updated: {new Date(repository.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}