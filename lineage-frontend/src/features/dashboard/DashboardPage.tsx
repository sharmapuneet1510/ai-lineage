import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { LayoutDashboard, Database, Globe, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL

interface DashboardSummary {
  total_jurisdictions: number
  total_fields: number
  lineage_coverage_percent: number
  high_risk_fields: number
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => axios.get<{ data: DashboardSummary }>(`${API}/dashboard/summary`),
  })

  const summary = data?.data?.data

  const stats = [
    {
      label: 'Total Fields',
      value: summary?.total_fields ?? '—',
      Icon: Database,
      color: '#1267e8',
      bg: '#dbeafe',
    },
    {
      label: 'Jurisdictions',
      value: summary?.total_jurisdictions ?? '—',
      Icon: Globe,
      color: '#00b96b',
      bg: '#dcfce7',
    },
    {
      label: 'Lineage Coverage',
      value: summary ? `${summary.lineage_coverage_percent}%` : '—',
      Icon: TrendingUp,
      color: '#f59e0b',
      bg: '#fef9c3',
    },
    {
      label: 'High Risk Fields',
      value: summary?.high_risk_fields ?? '—',
      Icon: AlertTriangle,
      color: '#ef4444',
      bg: '#fee2e2',
    },
  ]

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <LayoutDashboard size={20} color="var(--color-primary)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Dashboard</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Overview of your data lineage platform
        </p>
      </div>

      {isLoading ? (
        <div className="stat-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
              <div className="stat-card-icon" style={{ background: '#f1f5f9', width: 42, height: 42 }} />
              <div>
                <div style={{ width: 60, height: 28, background: '#f1f5f9', borderRadius: 6 }} />
                <div style={{ width: 100, height: 14, background: '#f1f5f9', borderRadius: 4, marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="stat-grid">
          {stats.map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="stat-card">
              <div className="stat-card-icon" style={{ background: bg }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div className="stat-card-value">{value}</div>
                <div className="stat-card-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="var(--color-primary)" />
              Recent Activity
            </span>
          </div>
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
            No recent activity to display
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color="var(--color-warning)" />
              High Risk Fields
            </span>
          </div>
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
            {summary?.high_risk_fields
              ? `${summary.high_risk_fields} fields require attention`
              : 'No high risk fields detected'}
          </div>
        </div>
      </div>
    </div>
  )
}
