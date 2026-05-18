import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { Zap } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const sourceTypeOptions = [
  { value: 'FIELD', label: 'Field', icon: '📋' },
  { value: 'XSLT_VARIABLE', label: 'XSLT Variable', icon: '⚙️' },
  { value: 'JAVA_METHOD', label: 'Java Method', icon: '☕' },
  { value: 'XPATH', label: 'XPath', icon: '🔍' },
]

const severityConfig = {
  HIGH: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '🟡' },
  LOW: { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' },
}

export default function ImpactAnalysisPage() {
  const [sourceType, setSourceType] = useState('FIELD')
  const [sourceValue, setSourceValue] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      if (!sourceValue?.trim()) {
        throw new Error('Please enter a source value')
      }
      const response = await fetch(`${API_BASE}/impact-analysis/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source_value: sourceValue,
        }),
      })
      if (!response.ok) throw new Error('Failed to run impact analysis')
      return response.json()
    },
    onSuccess: () => {
      setHasRun(true)
    },
  })

  const handleRunAnalysis = () => {
    reset()
    mutate()
  }

  const results = data?.data?.items || []
  const hasResults = results.length > 0

  const selectedTypeOption = sourceTypeOptions.find((o) => o.value === sourceType)

  const summarySeverity = (results: any[]) => {
    const severities = results.map((r) => r.severity)
    if (severities.includes('HIGH')) return 'HIGH'
    if (severities.includes('MEDIUM')) return 'MEDIUM'
    return 'LOW'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Impact Analysis</h1>
          <p className="text-lg text-slate-600">Analyze downstream impact of changes to fields, variables, and methods</p>
        </div>

        {/* Analysis Runner */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Analysis Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Source Type Selector */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-3">Source Type</label>
                <div className="space-y-2">
                  {sourceTypeOptions.map((option) => (
                    <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer transition-all" style={{borderColor: sourceType === option.value ? '#3b82f6' : '#e2e8f0', backgroundColor: sourceType === option.value ? '#eff6ff' : 'transparent'}}>
                      <input
                        type="radio"
                        value={option.value}
                        checked={sourceType === option.value}
                        onChange={(e) => setSourceType(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-sm font-medium text-slate-700">
                        {option.icon} {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Source Value Input */}
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {selectedTypeOption?.label} Name or ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Enter ${selectedTypeOption?.label.toLowerCase()} name...`}
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRunAnalysis()}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Run Button */}
              <div className="md:col-span-3 flex items-end">
                <button
                  onClick={handleRunAnalysis}
                  disabled={isPending || !sourceValue?.trim()}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Run Analysis
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isPending && <LoadingSpinner message="Running impact analysis..." />}

        {/* Error State */}
        {error && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to run impact analysis'}
            onRetry={handleRunAnalysis}
          />
        )}

        {/* Empty State */}
        {hasRun && !isPending && !error && !hasResults && (
          <EmptyState
            message="No impact results found"
            icon="🔍"
            subtext="The specified source may have no downstream dependencies"
          />
        )}

        {/* Results */}
        {!isPending && !error && hasResults && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600 font-medium">Total Impacted Items</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{results.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600 font-medium">Max Severity</p>
                <p className="text-3xl font-bold mt-2">
                  {summarySeverity(results) === 'HIGH' ? '🔴' : summarySeverity(results) === 'MEDIUM' ? '🟡' : '🟢'} {summarySeverity(results)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600 font-medium">High Severity</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{results.filter((r: any) => r.severity === 'HIGH').length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600 font-medium">Medium Severity</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{results.filter((r: any) => r.severity === 'MEDIUM').length}</p>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Impacted Items</h2>
                <p className="text-sm text-slate-600 mt-1">Found {results.length} item(s) affected by this change</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Target Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Target Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Severity</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {results.map((result: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{result.target_type}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{result.target_value}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                              severityConfig[result.severity as keyof typeof severityConfig]?.bg || 'bg-slate-100'
                            } ${severityConfig[result.severity as keyof typeof severityConfig]?.text || 'text-slate-800'}`}
                          >
                            {severityConfig[result.severity as keyof typeof severityConfig]?.icon || '◯'} {result.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{result.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
