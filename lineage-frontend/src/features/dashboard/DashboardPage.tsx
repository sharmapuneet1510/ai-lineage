import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ErrorState from '../../components/common/ErrorState'

const API_BASE = import.meta.env.VITE_API_BASE_URL

function StatCard({
  icon,
  title,
  value,
  color = 'blue',
  isLoading = false,
}: {
  icon: string
  title: string
  value: string | number
  color?: 'blue' | 'green' | 'red' | 'purple'
  isLoading?: boolean
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 font-medium text-sm">{title}</h3>
        <div className={`text-3xl ${colorClasses[color]}`}>{icon}</div>
      </div>
      {isLoading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-4xl font-bold text-gray-900">{value}</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get(`${API_BASE}/dashboard/summary`),
  })

  const summary = data?.data?.data || {}

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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your data lineage platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="🏛️"
          title="Total Jurisdictions"
          value={summary.total_jurisdictions || 0}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          icon="📊"
          title="Total Fields"
          value={summary.total_fields || 0}
          color="purple"
          isLoading={isLoading}
        />
        <StatCard
          icon="📈"
          title="Lineage Coverage"
          value={`${coverage}%`}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          icon="⚠️"
          title="High Risk Fields"
          value={summary.high_risk_fields || 0}
          color={summary.high_risk_fields > 0 ? 'red' : 'green'}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Lineage Coverage by Jurisdiction</h2>
          <div className="text-gray-500 text-center py-8">
            <p>Chart visualization would be displayed here</p>
          </div>
        </section>
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Changes</h2>
          <div className="text-gray-500 text-center py-8">
            <p>Timeline of recent changes would be displayed here</p>
          </div>
        </section>
      </div>
    </div>
  )
}
