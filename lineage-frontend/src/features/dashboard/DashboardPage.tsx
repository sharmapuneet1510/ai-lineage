import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get(`${API_BASE}/dashboard/summary`),
  })

  const summary = data?.data?.data || {}

  if (isLoading) return <LoadingSpinner message="Loading dashboard..." />

  if (error) {
    return (
      <ErrorState
        message="Failed to load dashboard data"
        onRetry={() => refetch()}
      />
    )
  }

  const coverage = summary.total_fields > 0
    ? Math.round((summary.fields_with_lineage / summary.total_fields) * 100)
    : 0

  return (
    <div className="page dashboard">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="metric-card bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 font-medium mb-2">Total Jurisdictions</h3>
          <p className="value text-3xl font-bold text-blue-600">{summary.total_jurisdictions || 0}</p>
        </div>
        <div className="metric-card bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 font-medium mb-2">Total Fields</h3>
          <p className="value text-3xl font-bold text-blue-600">{summary.total_fields || 0}</p>
        </div>
        <div className="metric-card bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 font-medium mb-2">Lineage Coverage</h3>
          <p className="value text-3xl font-bold text-green-600">{coverage}%</p>
        </div>
        <div className="metric-card bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 font-medium mb-2">High Risk Fields</h3>
          <p className={`value text-3xl font-bold ${summary.high_risk_fields > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.high_risk_fields || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Lineage Coverage by Jurisdiction</h2>
          <div className="text-gray-500 text-center py-8">
            <p>Chart visualization would be displayed here</p>
          </div>
        </section>
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Recent Changes</h2>
          <div className="text-gray-500 text-center py-8">
            <p>Timeline of recent changes would be displayed here</p>
          </div>
        </section>
      </div>
    </div>
  )
}
