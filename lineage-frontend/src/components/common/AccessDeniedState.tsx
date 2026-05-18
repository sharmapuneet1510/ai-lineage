export default function AccessDeniedState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-3">
          <span className="text-4xl">🔒</span>
        </div>
        <h2 className="text-xl font-semibold text-yellow-900 mb-2">Access Denied</h2>
        <p className="text-yellow-800">You don't have permission to view this content.</p>
        <p className="text-sm text-yellow-700 mt-3">Please contact your administrator if you believe this is an error.</p>
      </div>
    </div>
  )
}
