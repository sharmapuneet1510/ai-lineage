import { useState } from 'react'
import { Search, X, Database, GitBranch, Share2 } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL

interface SearchResult {
  id: string | number
  name: string
  type: string
  location?: string
  description?: string
}

const TYPE_CONFIG: Record<string, { color: string; badgeClass: string; Icon: any }> = {
  Field: { color: '#1267e8', badgeClass: 'badge-blue', Icon: Database },
  XsltVariable: { color: '#f59e0b', badgeClass: 'badge-yellow', Icon: GitBranch },
  XPath: { color: '#00b96b', badgeClass: 'badge-green', Icon: Share2 },
  JavaMethod: { color: '#8b5cf6', badgeClass: 'badge-purple', Icon: GitBranch },
}

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { color: '#667085', badgeClass: 'badge-gray', Icon: Search }
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState(false)

  const handleSearch = async (q: string) => {
    if (!q.trim()) return
    setIsLoading(true)
    setHasSearched(true)
    setError(false)
    try {
      const res = await axios.get(`${API}/search/global`, {
        params: { q },
        headers: { 'X-User': 'puneet.sharma' },
      })
      const data = res.data?.data?.items ?? res.data?.data ?? []
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setError(true)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Group by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const t = r.type ?? 'Other'
    if (!acc[t]) acc[t] = []
    acc[t].push(r)
    return acc
  }, {})

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Search size={20} color="var(--color-primary)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Global Search</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Search across fields, XSLT variables, XPath expressions, and Java methods
        </p>
      </div>

      {/* Search bar */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 36, paddingRight: query ? 36 : 12, fontSize: 14 }}
              placeholder="Search for fields, variables, methods..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
              autoFocus
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setHasSearched(false) }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            disabled={isLoading || !query}
            onClick={() => handleSearch(query)}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="section-card" style={{ borderColor: 'var(--color-danger)' }}>
          <div style={{ padding: 20, color: 'var(--color-danger)', fontSize: 13 }}>
            Error performing search. Please try again.
          </div>
        </div>
      )}

      {!hasSearched && !error && (
        <div className="section-card">
          <div className="empty-state">
            <Search size={36} style={{ opacity: 0.15, marginBottom: 16 }} />
            <div className="empty-state-title">Start typing to search</div>
            <div className="empty-state-sub">
              Search across TRADE_ID, v_trade_id, /trade/tradeId, and more
            </div>
          </div>
        </div>
      )}

      {hasSearched && !isLoading && !error && results.length === 0 && (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-state-title">No results for "{query}"</div>
            <div className="empty-state-sub">Try a different search term or check spelling</div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const cfg = getConfig(type)
        const { Icon } = cfg
        return (
          <div key={type} className="section-card">
            <div className="section-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={14} color={cfg.color} />
                <span className="section-card-title">{type}</span>
                <span className={`badge ${cfg.badgeClass}`}>{items.length}</span>
              </div>
            </div>
            <div className="data-table-wrap">
              {items.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 20px',
                    borderBottom: idx < items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: `${cfg.color}15`, color: cfg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'monospace' }}>
                        {result.name}
                      </span>
                      <span className={`badge ${cfg.badgeClass}`}>{result.type}</span>
                    </div>
                    {result.location && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 3 }}>{result.location}</div>
                    )}
                    {result.description && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {result.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
