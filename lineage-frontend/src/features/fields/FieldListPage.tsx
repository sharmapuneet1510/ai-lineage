import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fieldApi } from './fieldApi'

export default function FieldListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['fields', search, page],
    queryFn: () => fieldApi.searchFields(undefined, search, page),
  })

  return (
    <div className="page">
      <h1>Fields</h1>
      <input
        type="text"
        placeholder="Search fields..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
      />
      {isLoading && <p>Loading...</p>}
      {error && <p>Error loading fields</p>}
      {data && (
        <>
          <table>
            <thead>
              <tr>
                <th>Internal Name</th>
                <th>Business Name</th>
                <th>Jurisdiction</th>
                <th>Criticality</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data?.data?.items?.map((f: any) => (
                <tr key={f.field_id}>
                  <td>{f.internal_field_name}</td>
                  <td>{f.business_name}</td>
                  <td>{f.jurisdiction_code}</td>
                  <td>{f.criticality}</td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Page {page}</p>
        </>
      )}
    </div>
  )
}
