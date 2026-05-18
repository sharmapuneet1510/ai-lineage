import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get(`${API_BASE}/dashboard/summary`),
  })

  const summary = data?.data?.data || {}

  return (
    <div className="page dashboard">
      <h1>Dashboard</h1>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Jurisdictions</h3>
          <p className="value">{summary.total_jurisdictions}</p>
        </div>
        <div className="metric-card">
          <h3>Total Fields</h3>
          <p className="value">{summary.total_fields}</p>
        </div>
        <div className="metric-card">
          <h3>Lineage Coverage</h3>
          <p className="value">{Math.round((summary.fields_with_lineage / summary.total_fields) * 100)}%</p>
        </div>
        <div className="metric-card">
          <h3>High Risk Fields</h3>
          <p className="value alert">{summary.high_risk_fields}</p>
        </div>
      </div>
      <div className="sections">
        <section>
          <h2>Lineage Coverage by Jurisdiction</h2>
          {/* Chart would go here */}
        </section>
        <section>
          <h2>Recent Changes</h2>
          {/* Timeline would go here */}
        </section>
      </div>
    </div>
  )
}
