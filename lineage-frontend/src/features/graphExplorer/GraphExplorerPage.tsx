import { useState } from 'react'
import axios from 'axios'
import { Share2, Search, X, Info } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL

function nodeTypeClass(type: string) {
  const map: Record<string, string> = {
    Field: 'badge-blue', XsltVariable: 'badge-yellow', XPath: 'badge-green', JavaMethod: 'badge-purple',
  }
  return map[type] ?? 'badge-gray'
}

export default function GraphExplorerPage() {
  const [query, setQuery] = useState('')
  const [nodeType, setNodeType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query) return
    setIsLoading(true)
    setHasSearched(true)
    try {
      const res = await axios.post(
        `${API}/graph/search`,
        { query, node_types: nodeType ? [nodeType] : undefined },
        { headers: { 'X-User': 'puneet.sharma' } },
      )
      const results = res.data?.data?.nodes ?? res.data?.data ?? []
      setSearchResults(Array.isArray(results) ? results : [])
    } catch {
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Share2 size={18} color="var(--color-primary)" />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>Graph Explorer</h1>
      </div>

      {/* Search bar */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Search graph nodes (e.g. v_trade_id, TRADE_ID...)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select
          className="input select"
          style={{ width: 180 }}
          value={nodeType}
          onChange={e => setNodeType(e.target.value)}
        >
          <option value="">All Node Types</option>
          <option value="Field">Field</option>
          <option value="XsltVariable">XSLT Variable</option>
          <option value="XPath">XPath</option>
          <option value="JavaMethod">Java Method</option>
        </select>
        <button className="btn btn-primary" disabled={isLoading || !query} onClick={handleSearch}>
          <Search size={14} />
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Graph canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!hasSearched ? (
            <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={40} style={{ opacity: 0.15, marginBottom: 16 }} />
              <div className="empty-state-title">Search to explore the lineage graph</div>
              <div className="empty-state-sub">Enter a field name, XSLT variable, or XPath expression</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state-title">No nodes found</div>
              <div className="empty-state-sub">Try a different search term</div>
            </div>
          ) : (
            <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {searchResults.map((node: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      padding: 12,
                      background: selectedNode?.id === node.id ? 'var(--color-primary)' : 'var(--color-surface)',
                      border: `1px solid ${selectedNode?.id === node.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      color: selectedNode?.id === node.id ? '#fff' : 'var(--color-text)',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedNode?.id !== node.id) {
                        e.currentTarget.style.borderColor = 'var(--color-primary)'
                        e.currentTarget.style.background = 'var(--color-bg)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedNode?.id !== node.id) {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.background = 'var(--color-surface)'
                      }
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                      {node.name}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                      {node.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        {selectedNode && (
          <div style={{ width: 300, borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Info size={14} color="var(--color-primary)" />
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>Node Details</span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Name</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{selectedNode.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Type</div>
                <span className={`badge ${nodeTypeClass(selectedNode.type)}`}>{selectedNode.type}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Node ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>{selectedNode.id}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
