import LoadingSpinner from '@/components/atoms/LoadingSpinner/LoadingSpinner'

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
  withGradient?: boolean
}

export default function LoadingScreen({
  message = 'Loading...',
  fullScreen = true,
  withGradient = false
}: LoadingScreenProps) {
  const containerClass = fullScreen
    ? `min-h-screen flex items-center justify-center ${
        withGradient ? 'bg-gradient-to-br from-blue-50 to-indigo-100' : ''
      }`
    : 'flex items-center justify-center p-8'

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 text-center">
          {message}
        </p>
      </div>
    </div>
  )
}