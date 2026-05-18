import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { fieldApi } from './fieldApi'
import { useDebounce } from '../../hooks/useDebounce'

const CRITICALITY_CLASS: Record<string, string> = {
  HIGH: 'badge-red',
  MEDIUM: 'badge-yellow',
  LOW: 'badge-green',
}

const STATUS_CLASS: Record<string, string> = {
  APPROVED: 'badge-green',
  PENDING: 'badge-yellow',
  DEPRECATED: 'badge-gray',
}

export default function FieldListPage() {
  const [search, setSearch] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['fields', debouncedSearch, jurisdiction, page],
    queryFn: () => fieldApi.searchFields(jurisdiction || undefined, debouncedSearch || undefined, page),
  })

  const fields = data?.data?.data?.items ?? []
  const total = data?.data?.data?.total ?? 0
  const totalPages = data?.data?.data?.totalPages ?? 1

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
            Fields
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            {total} fields across all jurisdictions
          </p>
        </div>
      </div>

      <div className="section-card">
        {/* Filter bar */}
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Search fields..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
            <select
              className="input select"
              style={{ paddingLeft: 30, width: 160 }}
              value={jurisdiction}
              onChange={e => { setJurisdiction(e.target.value); setPage(1) }}
            >
              <option value="">All Jurisdictions</option>
              <option value="JFSA">JFSA</option>
              <option value="MAS">MAS</option>
              <option value="ASIC">ASIC</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Business Name</th>
                <th>Jurisdiction</th>
                <th>Data Type</th>
                <th>Criticality</th>
                <th>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, width: j === 6 ? 24 : '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : fields.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-title">No fields found</div>
                      <div className="empty-state-sub">Try adjusting your search or filter</div>
                    </div>
                  </td>
                </tr>
              ) : (
                fields.map((field: any) => (
                  <tr key={field.field_id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)', fontWeight: 600 }}>
                        {field.internal_field_name}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {field.business_display_name || field.internal_field_name}
                    </td>
                    <td>
                      <span className="badge badge-blue">{field.jurisdiction_code}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-muted)' }}>
                      {field.data_type}
                    </td>
                    <td>
                      <span className={`badge ${CRITICALITY_CLASS[field.criticality] ?? 'badge-gray'}`}>
                        {field.criticality}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[field.status] ?? 'badge-gray'}`}>
                        {field.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/fields/${field.field_id}`} style={{ color: 'var(--color-primary)', display: 'flex' }}>
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
