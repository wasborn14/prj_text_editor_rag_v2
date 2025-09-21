'use client';

interface BranchIndicatorProps {
  repositoryName?: string;
  branchName?: string;
}

export default function BranchIndicator({
  repositoryName,
  branchName = 'main'
}: BranchIndicatorProps) {
  if (!repositoryName) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm text-gray-600">
      {/* リポジトリアイコン */}
      <svg
        className="w-4 h-4 text-gray-500"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M20 7.5V19a2 2 0 01-2 2H6a2 2 0 01-2-2V7.5m16 0V5a2 2 0 00-2-2h-4.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293H6a2 2 0 00-2 2v1.5h16z" />
      </svg>

      {/* リポジトリ名 */}
      <span className="font-medium">{repositoryName}</span>

      {/* 区切り */}
      <span className="text-gray-400">/</span>

      {/* ブランチアイコン */}
      <svg
        className="w-4 h-4 text-gray-500"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M13 5H19M19 5V11M19 5L5 19M5 5L5 19L19 19" />
      </svg>

      {/* ブランチ名 */}
      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
        {branchName}
      </span>

      {/* デフォルトブランチ表示 */}
      <span className="text-xs text-gray-500">(default)</span>

      {/* 将来の拡張用プレースホルダー */}
      {/* Phase 5でドロップダウンメニューに変更 */}
      <button
        className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors opacity-50 cursor-not-allowed"
        disabled
        title="Branch switching will be available in a future update"
      >
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}