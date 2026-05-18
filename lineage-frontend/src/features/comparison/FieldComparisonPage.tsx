import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { GitCompare, Search, AlertCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL

export function FieldComparisonPage() {
  const [concept, setConcept] = useState('')
  const [jurisdictions, setJurisdictions] = useState('')
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comparison', concept, jurisdictions],
    queryFn: () =>
      axios.get(`${API}/fields/comparison`, {
        params: { concept, jurisdictions },
        headers: { 'X-User': 'puneet.sharma' },
      }),
    enabled,
  })

  const items = data?.data?.data?.items ?? []
  const jCodes = jurisdictions.split(',').map(s => s.trim()).filter(Boolean)

  const handleCompare = () => {
    if (!concept || !jurisdictions) return
    setEnabled(true)
    setTimeout(() => refetch(), 0)
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <GitCompare size={20} color="var(--color-primary)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Field Comparison</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Compare field definitions across jurisdictions by business concept
        </p>
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-card-header">
          <span className="section-card-title">Search Parameters</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Business Concept
            </label>
            <input
              className="input"
              placeholder="e.g. Trade Identifier"
              value={concept}
              onChange={e => setConcept(e.target.value)}
            />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Jurisdictions (comma-separated)
            </label>
            <input
              className="input"
              placeholder="e.g. JFSA, MAS, ASIC"
              value={jurisdictions}
              onChange={e => setJurisdictions(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn btn-primary"
              disabled={isLoading || !concept || !jurisdictions}
              onClick={handleCompare}
            >
              <Search size={14} />
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="section-card" style={{ borderColor: 'var(--color-danger)' }}>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-danger)' }}>
            <AlertCircle size={16} /> Error loading comparison data
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Comparison Results — "{concept}"</span>
            <span className="badge badge-blue">{jCodes.length} jurisdictions</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  {jCodes.map(j => <th key={j}>{j}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{row.attribute}</td>
                    {jCodes.map(j => (
                      <td key={j} style={{ fontFamily: row.attribute === 'Data Type' ? 'monospace' : undefined, fontSize: row.attribute === 'Data Type' ? 12 : 13 }}>
                        {row[j] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {enabled && !isLoading && items.length === 0 && !error && (
        <div className="section-card">
          <div className="empty-state">
            <GitCompare size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div className="empty-state-title">No comparison results</div>
            <div className="empty-state-sub">No fields found matching "{concept}" in the selected jurisdictions</div>
          </div>
        </div>
      )}
    </div>
  )
}
