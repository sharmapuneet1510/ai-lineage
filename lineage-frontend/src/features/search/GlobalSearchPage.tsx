import { useState, useMemo } from 'react'
import axios from 'axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { Search, X } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

interface SearchResult {
  id: string
  name: string
  type: string
  location?: string
  description?: string
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  Field: { icon: '📋', color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Field' },
  XsltVariable: { icon: '⚙️', color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'XSLT Variable' },
  XsltFile: { icon: '📄', color: 'bg-purple-50 text-purple-700 border-purple-100', label: 'XSLT File' },
  JavaMethod: { icon: '☕', color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Java Method' },
  JavaClass: { icon: '🔷', color: 'bg-orange-50 text-orange-700 border-orange-100', label: 'Java Class' },
  XPath: { icon: '🔍', color: 'bg-pink-100 text-pink-700 border-pink-200', label: 'XPath' },
  DownstreamSystem: { icon: '🌍', color: 'bg-green-100 text-green-700 border-green-200', label: 'System' },
  Database: { icon: '🗄️', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Database' },
  Table: { icon: '📊', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', label: 'Table' },
  ValidationRule: { icon: '✓', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Validation Rule' },
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setHasSearched(true)
    setError(null)

    try {
      const response = await axios.get(`${API_BASE}/search/global`, {
        params: { q: query },
      })
      setResults(response.data.data?.items || response.data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
      console.error('Search failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setError(null)
    setSelectedType(null)
  }

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = []
      }
      groups[result.type].push(result)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [results])

  // Filter by selected type
  const filteredResults = selectedType ? results.filter((r) => r.type === selectedType) : results

  const filteredGroupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    filteredResults.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = []
      }
      groups[result.type].push(result)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredResults])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Global Search</h1>
          <p className="text-lg text-slate-600">Search across fields, variables, methods, systems, and more</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search fields, variables, methods, systems, databases..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-500"
              />
              {query && (
                <button
                  onClick={handleClear}
                  title="Clear search"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && <ErrorState message={error} onRetry={handleSearch} />}

        {/* Loading State */}
        {isLoading && <LoadingSpinner message="Searching across all entities..." />}

        {/* Empty State - No Search */}
        {!hasSearched && !isLoading && !error && (
          <EmptyState message="Start searching" icon="🔍" subtext="Find fields, variables, methods, systems, and other resources" />
        )}

        {/* Empty State - No Results */}
        {hasSearched && !isLoading && !error && results.length === 0 && (
          <EmptyState message={`No results found for "${query}"`} icon="🔍" subtext="Try a different search term or broaden your search" />
        )}

        {/* Results with Grouping */}
        {filteredGroupedResults.length > 0 && (
          <div className="space-y-6">
            {/* Filter Tags */}
            {results.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-slate-600 font-medium">Filter:</span>
                <button
                  onClick={() => setSelectedType(null)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedType === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  All ({results.length})
                </button>
                {groupedResults.map(([type, typeResults]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                      selectedType === type
                        ? 'bg-blue-600 text-white'
                        : `${typeConfig[type]?.color || 'bg-slate-200 text-slate-700'} hover:opacity-80`
                    }`}
                  >
                    {typeConfig[type]?.icon || '•'} {type} ({typeResults.length})
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            <div className="space-y-6">
              {filteredGroupedResults.map(([type, typeResults]) => (
                <div key={type} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Group Header */}
                  <div className={`px-6 py-4 border-b border-slate-200 ${typeConfig[type]?.color?.split(' ').slice(0, 2).join(' ') || 'bg-slate-100'}`}>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {typeConfig[type]?.icon || '•'} {type} ({typeResults.length})
                    </h3>
                  </div>

                  {/* Results */}
                  <div className="divide-y divide-slate-200">
                    {typeResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-slate-900 truncate">{result.name}</h4>
                            {result.location && (
                              <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                                📍 {result.location}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap flex-shrink-0 ${
                              typeConfig[type]?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {typeConfig[type]?.label || type}
                          </span>
                        </div>
                        {result.description && (
                          <p className="text-slate-700 text-sm line-clamp-2 mt-2">{result.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-slate-100 rounded-lg p-4 text-center">
              <p className="text-slate-700">
                Showing <strong>{filteredResults.length}</strong> result{filteredResults.length !== 1 ? 's' : ''} of{' '}
                <strong>{results.length}</strong> total
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
