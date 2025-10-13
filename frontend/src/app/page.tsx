export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Text Editor RAG
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          RAG-powered Markdown Editor with GitHub Integration
        </p>
        <div className="mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            準備完了 - ログイン機能から実装を開始できます
          </p>
        </div>
      </div>
    </div>
  )
}
