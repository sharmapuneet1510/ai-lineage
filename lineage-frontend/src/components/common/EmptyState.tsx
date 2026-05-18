interface EmptyStateProps {
  message?: string
  icon?: string
  subtext?: string
}

export default function EmptyState({
  message = "No data found",
  icon = "📭",
  subtext
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center max-w-md w-full">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{message}</h3>
        {subtext && <p className="text-sm text-gray-600">{subtext}</p>}
      </div>
    </div>
  )
}
