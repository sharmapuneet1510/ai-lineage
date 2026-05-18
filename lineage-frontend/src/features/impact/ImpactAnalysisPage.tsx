import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

export default function ImpactAnalysisPage() {
  const [sourceType, setSourceType] = useState('FIELD')
  const [sourceValue, setSourceValue] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const { mutate, data, isLoading, error, reset } = useMutation({
    mutationFn: async () => {
      if (!sourceValue?.trim()) {
        throw new Error('Please enter a source value')
      }
      const response = await fetch('/api/impact-analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source_value: sourceValue
        })
      })
      if (!response.ok) throw new Error('Failed to run impact analysis')
      return response.json()
    },
    onSuccess: () => {
      setHasRun(true)
    }
  })

  const handleRunAnalysis = () => {
    reset()
    mutate()
  }

  const results = data?.data?.items || []
  const hasResults = results.length > 0

  return (
    <div className="page">
      <h1 className="text-3xl font-bold mb-6">Impact Analysis</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FIELD">Field</option>
              <option value="XSLT_VARIABLE">XSLT Variable</option>
              <option value="JAVA_METHOD">Java Method</option>
              <option value="XPATH">XPath</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Value</label>
            <input
              type="text"
              placeholder="Enter source value..."
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading || !sourceValue?.trim()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              Run Analysis
            </button>
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner message="Running impact analysis..." />}

      {error && (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to run impact analysis"}
          onRetry={handleRunAnalysis}
        />
      )}

      {hasRun && !isLoading && !error && !hasResults && (
        <EmptyState
          message="No impact results found"
          icon="🔍"
          subtext="The specified source may have no downstream dependencies"
        />
      )}

      {!isLoading && !error && hasResults && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Impact Results</h2>
            <p className="text-sm text-gray-600 mt-1">Found {results.length} impacted item(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Target Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Target Value</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Severity</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result: any, idx: number) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3">{result.target_type}</td>
                    <td className="px-6 py-3">{result.target_value}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        result.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                        result.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {result.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3">{result.status || 'PENDING'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
