import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { Filter, RefreshCw } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export default function FieldComparisonPage() {
  const [concept, setConcept] = useState('')
  const [jurisdictions, setJurisdictions] = useState<string[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [showJurisdictionInput, setShowJurisdictionInput] = useState(false)
  const [jurisdictionInput, setJurisdictionInput] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comparison', concept, jurisdictions],
    queryFn: async () => {
      if (!concept || jurisdictions.length === 0) return null
      const response = await fetch(
        `${API_BASE}/comparison/fields?concept=${encodeURIComponent(concept)}&jurisdictions=${jurisdictions.join(',')}`
      )
      if (!response.ok) throw new Error('Failed to fetch comparison')
      return response.json()
    },
    enabled: false,
  })

  const handleCompare = () => {
    if (!concept?.trim()) return
    if (jurisdictions.length === 0) return
    setIsComparing(true)
    refetch()
  }

  const handleAddJurisdiction = () => {
    if (jurisdictionInput.trim() && !jurisdictions.includes(jurisdictionInput.trim())) {
      setJurisdictions([...jurisdictions, jurisdictionInput.trim()])
      setJurisdictionInput('')
    }
  }

  const handleRemoveJurisdiction = (j: string) => {
    setJurisdictions(jurisdictions.filter((jur) => jur !== j))
  }

  const results = data?.data?.items || []
  const hasResults = results.length > 0

  const getValueStyle = (value: string | null, column: number) => {
    if (!value) return ''
    // Highlight differences
    const values = results.map((r: any) => r[jurisdictions[column]])
    const uniqueValues = new Set(values)
    if (uniqueValues.size > 1) {
      return 'bg-amber-50'
    }
    return ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Field Comparison</h1>
          <p className="text-lg text-slate-600">Compare field definitions across multiple jurisdictions</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Comparison Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Business Concept Input */}
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Business Concept</label>
                <input
                  type="text"
                  placeholder="e.g., Customer, Order..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCompare()}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-500"
                />
              </div>

              {/* Jurisdictions Selector */}
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Jurisdictions</label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 p-2 border border-slate-300 rounded-lg bg-slate-50 min-h-[42px]">
                    {jurisdictions.map((j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {j}
                        <button
                          onClick={() => handleRemoveJurisdiction(j)}
                          className="text-blue-600 hover:text-blue-900 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {jurisdictions.length === 0 && <span className="text-slate-500 text-sm py-1">Add jurisdictions...</span>}
                  </div>

                  {showJurisdictionInput && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg p-3 z-10">
                      <input
                        type="text"
                        placeholder="Enter jurisdiction code..."
                        value={jurisdictionInput}
                        onChange={(e) => setJurisdictionInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddJurisdiction()}
                        autoFocus
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleAddJurisdiction}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowJurisdictionInput(false)}
                          className="flex-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-medium rounded-lg transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!showJurisdictionInput && (
                  <button
                    onClick={() => setShowJurisdictionInput(true)}
                    className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add jurisdiction
                  </button>
                )}
              </div>

              {/* Compare Button */}
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={handleCompare}
                  disabled={isLoading || !concept?.trim() || jurisdictions.length === 0}
                  className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Compare
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSpinner message="Comparing fields across jurisdictions..." />}

        {/* Error State */}
        {error && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to compare fields'}
            onRetry={() => refetch()}
          />
        )}

        {/* Empty State */}
        {isComparing && !isLoading && !error && !hasResults && (
          <EmptyState message="No comparison results found" icon="🔍" subtext="Try different criteria or add more jurisdictions" />
        )}

        {/* Comparison Table */}
        {!isLoading && !error && hasResults && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Comparison Results</h2>
              <p className="text-sm text-slate-600 mt-1">{results.length} attributes compared across {jurisdictions.length} jurisdictions</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 w-1/4">Attribute</th>
                    {jurisdictions.map((j) => (
                      <th key={j} className="px-6 py-3 text-left text-sm font-semibold text-slate-900 min-w-[200px]">
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((result: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 bg-slate-50 font-semibold">
                        {result.attribute}
                      </td>
                      {jurisdictions.map((j, colIdx) => (
                        <td
                          key={j}
                          className={`px-6 py-4 text-sm text-slate-700 ${getValueStyle(result[j], colIdx)}`}
                        >
                          {result[j] || <span className="text-slate-400 italic">N/A</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
