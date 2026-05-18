import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

export default function FieldComparisonPage() {
  const [concept, setConcept] = useState('')
  const [jurisdictions, setJurisdictions] = useState<string[]>([])
  const [isComparing, setIsComparing] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comparison', concept, jurisdictions],
    queryFn: async () => {
      if (!concept || jurisdictions.length === 0) return null
      const response = await fetch(`/api/fields/comparison?concept=${concept}&jurisdictions=${jurisdictions.join(',')}`)
      if (!response.ok) throw new Error('Failed to fetch comparison')
      return response.json()
    },
    enabled: false
  })

  const handleCompare = () => {
    if (!concept?.trim()) {
      alert('Please enter a business concept')
      return
    }
    if (jurisdictions.length === 0) {
      alert('Please select at least one jurisdiction')
      return
    }
    setIsComparing(true)
    refetch()
  }

  const results = data?.data?.items || []
  const hasResults = results.length > 0

  return (
    <div className="page">
      <h1 className="text-3xl font-bold mb-6">Field Comparison</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Enter business concept..."
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Enter jurisdictions (comma-separated)..."
            value={jurisdictions.join(', ')}
            onChange={(e) => setJurisdictions(e.target.value.split(',').map(j => j.trim()))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCompare}
            disabled={isLoading || !concept?.trim() || jurisdictions.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
          >
            Compare
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner message="Comparing fields..." />}

      {error && (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to compare fields"}
          onRetry={() => refetch()}
        />
      )}

      {isComparing && !isLoading && !error && !hasResults && (
        <EmptyState
          message="No comparison results found"
          icon="🔍"
          subtext="Try different criteria"
        />
      )}

      {!isLoading && !error && hasResults && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left font-semibold">Attribute</th>
                {jurisdictions.map(j => (
                  <th key={j} className="px-4 py-2 text-left font-semibold">{j}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((result: any, idx: number) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{result.attribute}</td>
                  {jurisdictions.map(j => (
                    <td key={j} className="px-4 py-2">{result[j] || 'N/A'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
