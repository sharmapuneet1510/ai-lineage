import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fieldApi } from './fieldApi'
import { useDebounce } from '../../hooks/useDebounce'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

function CriticalityBadge({ criticality }: { criticality: string }) {
  const colorMap: { [key: string]: string } = {
    'CRITICAL': 'bg-red-100 text-red-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'LOW': 'bg-green-100 text-green-800',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorMap[criticality] || 'bg-gray-100 text-gray-800'}`}>
      {criticality || 'UNKNOWN'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: { [key: string]: string } = {
    'ACTIVE': 'bg-green-50 text-green-700 border border-green-200',
    'INACTIVE': 'bg-gray-50 text-gray-700 border border-gray-200',
    'ARCHIVED': 'bg-slate-50 text-slate-700 border border-slate-200',
  }
  return (
    <span className={`px-3 py-1 rounded text-sm font-medium ${colorMap[status] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
      {status}
    </span>
  )
}

export default function FieldListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filterCriticality, setFilterCriticality] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fields', debouncedSearch, page, filterCriticality],
    queryFn: () => fieldApi.searchFields(undefined, debouncedSearch, page),
  })

  const items = data?.data?.data?.items || []
  const total = data?.data?.data?.total || 0
  const hasItems = items.length > 0

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Fields</h1>
        <p className="text-gray-600">Search and explore all fields in your system</p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by internal name, business name, or jurisdiction..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCriticality(filterCriticality === c ? '' : c)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterCriticality === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner message="Loading fields..." />}

      {error && (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load fields"}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && !hasItems && (
        <EmptyState
          message="No fields found"
          icon="📭"
          subtext={search ? "Try adjusting your search criteria" : "Start by searching for a field"}
        />
      )}

      {!isLoading && !error && hasItems && (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Internal Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Business Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Jurisdiction</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criticality</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f: any) => (
                    <tr key={f.field_id} className="border-b hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{f.internal_field_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{f.business_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{f.jurisdiction_code}</td>
                      <td className="px-6 py-4 text-sm">
                        <CriticalityBadge criticality={f.criticality} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={f.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center px-2">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{Math.ceil(total / 25)}</span> | Total: <span className="font-semibold">{total}</span> fields
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={items.length === 0}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
