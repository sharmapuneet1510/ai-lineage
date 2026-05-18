import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Network, Play, AlertTriangle, Info } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL

const SEVERITY_CLASS: Record<string, string> = {
  HIGH: 'badge-red', MEDIUM: 'badge-yellow', LOW: 'badge-green', CRITICAL: 'badge-red',
}

export default function ImpactAnalysisPage() {
  const [sourceType, setSourceType] = useState('FIELD')
  const [sourceValue, setSourceValue] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      axios.post(
        `${API}/impact-analysis/run?source_type=${sourceType}&source_value=${encodeURIComponent(sourceValue)}`,
        {},
        { headers: { 'X-User': 'puneet.sharma' } },
      ),
  })

  const items = mutation.data?.data?.data?.items ?? mutation.data?.data?.items ?? []

  const handleRun = () => {
    if (!sourceValue) return
    setHasRun(true)
    mutation.mutate()
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Network size={20} color="var(--color-primary)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Impact Analysis</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Trace downstream dependencies and assess change impact
        </p>
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-card-header">
          <span className="section-card-title">Analysis Parameters</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Source Type
            </label>
            <select
              className="input select"
              value={sourceType}
              onChange={e => setSourceType(e.target.value)}
            >
              <option value="FIELD">Field</option>
              <option value="XSLT_VARIABLE">XSLT Variable</option>
              <option value="JAVA_METHOD">Java Method</option>
              <option value="XPATH">XPath</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Source Value
            </label>
            <input
              className="input"
              placeholder="e.g. TRADE_ID"
              value={sourceValue}
              onChange={e => setSourceValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRun()}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn btn-primary"
              disabled={mutation.isPending || !sourceValue}
              onClick={handleRun}
            >
              <Play size={14} />
              {mutation.isPending ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>

      {mutation.isError && (
        <div className="section-card" style={{ borderColor: 'var(--color-danger)', marginBottom: 20 }}>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-danger)' }}>
            <AlertTriangle size={16} /> Error running analysis. Check the source value and try again.
          </div>
        </div>
      )}

      {hasRun && !mutation.isPending && items.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Impact Results for "{sourceValue}"</span>
            <span className="badge badge-blue">{items.length} affected</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Affected Component</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                      {item.component_name ?? item.name ?? '—'}
                    </td>
                    <td>
                      <span className="badge badge-gray">{item.type ?? '—'}</span>
                    </td>
                    <td>
                      <span className={`badge ${SEVERITY_CLASS[item.severity] ?? 'badge-gray'}`}>
                        {item.severity ?? '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {item.description ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasRun && !mutation.isPending && items.length === 0 && !mutation.isError && (
        <div className="section-card">
          <div className="empty-state">
            <Info size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div className="empty-state-title">No impact detected</div>
            <div className="empty-state-sub">"{sourceValue}" has no downstream dependencies in the graph</div>
          </div>
        </div>
      )}
    </div>
  )
}
