import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fieldApi } from './fieldApi'
import { useDebounce } from '../../hooks/useDebounce'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

export default function FieldListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 500)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fields', debouncedSearch, page],
    queryFn: () => fieldApi.searchFields(undefined, debouncedSearch, page),
  })

  const items = data?.data?.data?.items || []
  const hasItems = items.length > 0

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fields</h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search fields..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Internal Name</th>
                  <th className="px-4 py-2 text-left">Business Name</th>
                  <th className="px-4 py-2 text-left">Jurisdiction</th>
                  <th className="px-4 py-2 text-left">Criticality</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f: any) => (
                  <tr key={f.field_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{f.internal_field_name}</td>
                    <td className="px-4 py-2">{f.business_name}</td>
                    <td className="px-4 py-2">{f.jurisdiction_code}</td>
                    <td className="px-4 py-2">{f.criticality}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${f.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <p className="text-gray-600">Page {page} | Total: {data?.data?.data?.total || 0} items</p>
            <div className="space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={items.length === 0}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
