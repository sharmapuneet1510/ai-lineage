import { useState } from 'react'
import axios from 'axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

const API_BASE = import.meta.env.VITE_API_BASE_URL

interface SearchResult {
  id: string
  name: string
  type: string
  location?: string
  description?: string
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  }

  return (
    <div className="page global-search">
      <h1 className="text-3xl font-bold mb-8">Global Search</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search fields, variables, methods, systems..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {query && (
              <button
                onClick={handleClear}
                title="Clear search"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <ErrorState
          message={error}
          onRetry={handleSearch}
        />
      )}

      {isLoading && <LoadingSpinner message="Searching..." />}

      {!hasSearched && !isLoading && !error && (
        <EmptyState
          message="Enter a search query"
          icon="🔍"
          subtext="Find fields, variables, methods, and more"
        />
      )}

      {hasSearched && !isLoading && !error && results.length === 0 && (
        <EmptyState
          message={`No results found for "${query}"`}
          icon="🔍"
          subtext="Try a different search term"
        />
      )}

      {results.length > 0 && (
        <div className="results-container bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <p className="text-gray-700">
              Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y">
            {results.map((result, idx) => (
              <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{result.name}</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {result.type}
                  </span>
                </div>
                {result.location && (
                  <p className="text-sm text-gray-600 mb-2">📍 {result.location}</p>
                )}
                {result.description && (
                  <p className="text-gray-700">{result.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
