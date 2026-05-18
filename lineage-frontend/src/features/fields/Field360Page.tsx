import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fieldApi } from './fieldApi'
import { useState } from 'react'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import AccessDeniedState from '../../components/common/AccessDeniedState'

export default function Field360Page() {
  const { fieldId } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['field', fieldId],
    queryFn: () => fieldApi.getField(Number(fieldId)),
  })

  if (isLoading) return <LoadingSpinner message="Loading field details..." />

  if (error) {
    const statusCode = (error as any)?.response?.status
    if (statusCode === 403) {
      return <AccessDeniedState />
    }
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load field details"}
        onRetry={() => refetch()}
      />
    )
  }

  const field = data?.data?.data?.field
  if (!field) {
    return (
      <ErrorState
        message="Field not found"
        onRetry={() => refetch()}
      />
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'business', label: 'Business' },
    { id: 'technical', label: 'Technical' },
    { id: 'xslt', label: 'XSLT' },
    { id: 'java', label: 'Java' },
    { id: 'downstream', label: 'Downstream' }
  ]

  return (
    <div className="page">
      <div className="field-header mb-8">
        <h1 className="text-3xl font-bold mb-2">{field?.business_name || field?.internal_field_name}</h1>
        <p className="text-gray-600">{field?.jurisdiction_code}</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tab-content bg-white rounded-lg p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">Data Type</h3>
              <p className="text-gray-900">{field?.data_type || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Criticality</h3>
              <p className="text-gray-900">{field?.criticality || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Status</h3>
              <p className="text-gray-900">{field?.status || 'N/A'}</p>
            </div>
          </div>
        )}
        {activeTab === 'business' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Business Interpretation</h3>
            <p className="text-gray-900">{data?.data?.data?.business_interpretation || 'No data available'}</p>
          </div>
        )}
        {activeTab === 'technical' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Technical Interpretation</h3>
            <p className="text-gray-900">{data?.data?.data?.technical_interpretation || 'No data available'}</p>
          </div>
        )}
        {activeTab === 'xslt' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">XSLT Variables</h3>
            <p className="text-gray-900">Count: {data?.data?.data?.xslt_variables?.length || 0}</p>
            {data?.data?.data?.xslt_variables?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {data.data.data.xslt_variables.map((v: any, i: number) => (
                  <li key={i} className="text-sm text-gray-600">{v}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === 'java' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Java Methods</h3>
            <p className="text-gray-900">Count: {data?.data?.data?.java_methods?.length || 0}</p>
            {data?.data?.data?.java_methods?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {data.data.data.java_methods.map((m: any, i: number) => (
                  <li key={i} className="text-sm text-gray-600">{m}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === 'downstream' && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Downstream Systems</h3>
            <p className="text-gray-900">Count: {data?.data?.data?.downstream_systems?.length || 0}</p>
            {data?.data?.data?.downstream_systems?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {data.data.data.downstream_systems.map((s: any, i: number) => (
                  <li key={i} className="text-sm text-gray-600">{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
