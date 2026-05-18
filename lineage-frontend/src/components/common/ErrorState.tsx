interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ message = "An error occurred", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-lg font-semibold text-red-900">Error</h3>
        </div>
        <p className="text-red-800 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
