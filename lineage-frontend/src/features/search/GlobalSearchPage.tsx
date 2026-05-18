import { useState } from 'react'
import axios from 'axios'

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

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setHasSearched(true)
    try {
      const response = await axios.get(`${API_BASE}/search/global`, {
        params: { q: query },
      })
      setResults(response.data.data?.items || response.data.data || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
  }

  return (
    <div className="page global-search">
      <h1>Global Search</h1>

      <div className="search-box">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search fields, variables, methods, systems..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          {query && (
            <button className="clear-btn" onClick={handleClear} title="Clear search">
              ✕
            </button>
          )}
        </div>
        <button onClick={handleSearch} disabled={isLoading || !query.trim()}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="results-container">
        {isLoading && (
          <div className="loading">
            <p>Searching...</p>
          </div>
        )}

        {hasSearched && !isLoading && results.length === 0 && (
          <div className="no-results">
            <p>No results found for "{query}"</p>
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="initial-state">
            <p>Enter a search query to find fields, variables, methods, and more.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="results">
            <div className="results-info">
              <p>Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''}</p>
            </div>
            {results.map((result, idx) => (
              <div key={idx} className="result-item">
                <div className="result-header">
                  <h4>{result.name}</h4>
                  <span className="type-badge">{result.type}</span>
                </div>
                {result.location && (
                  <p className="location">{result.location}</p>
                )}
                {result.description && (
                  <p className="description">{result.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
