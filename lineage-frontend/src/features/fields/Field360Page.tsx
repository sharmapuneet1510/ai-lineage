import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fieldApi } from './fieldApi'
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Node, Edge } from 'reactflow'
import LineageGraph from '../../components/graph/LineageGraph'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import AccessDeniedState from '../../components/common/AccessDeniedState'
import '../fields/field360.css'

export default function Field360Page() {
  const navigate = useNavigate()
  const { fieldId } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['field', fieldId],
    queryFn: () => fieldApi.getField(Number(fieldId)),
  })

  if (isLoading) return <LoadingSpinner message="Loading field 360..." />

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

  // Determine status and criticality badge colors
  const getStatusBadgeClass = (status: string): string => {
    const statusMap: Record<string, string> = {
      'DRAFT': 'badge-yellow',
      'PUBLISHED': 'badge-green',
      'DEPRECATED': 'badge-red',
      'ACTIVE': 'badge-blue',
    }
    return statusMap[status?.toUpperCase()] || 'badge-gray'
  }

  const getCriticalityBadgeClass = (criticality: string): string => {
    const criticalityMap: Record<string, string> = {
      'LOW': 'badge-green',
      'MEDIUM': 'badge-yellow',
      'HIGH': 'badge-red',
      'CRITICAL': 'badge-red',
    }
    return criticalityMap[criticality?.toUpperCase()] || 'badge-gray'
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'business', label: 'Business', icon: '💼' },
    { id: 'technical', label: 'Technical', icon: '⚙️' },
    { id: 'xslt', label: 'XSLT', icon: '🔄' },
    { id: 'java', label: 'Java', icon: '☕' },
    { id: 'downstream', label: 'Downstream', icon: '➡️' }
  ]

  // Mock lineage graph data
  const graphNodes: Node[] = [
    { id: 'field-1', data: { label: field.business_name || field.internal_field_name }, position: { x: 0, y: 0 }, type: 'field' },
  ]

  const graphEdges: Edge[] = []

  return (
    <div className="field360-page">
      {/* Header */}
      <header className="field360-header">
        <div className="field360-header-top">
          <div className="field360-header-left">
            <button
              onClick={() => navigate(-1)}
              className="back-button"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
              <span>Back</span>
            </button>
          </div>

          <div className="field360-header-center">
            <h1 className="field-title">
              {field.business_name || field.internal_field_name}
            </h1>
            <p className="field-id">ID: {field.field_id || fieldId}</p>
          </div>

          <div className="field360-header-right">
            <div className="badges">
              <span className={`badge ${getStatusBadgeClass(field.status)}`}>
                {field.status}
              </span>
              <span className={`badge ${getCriticalityBadgeClass(field.criticality)}`}>
                {field.criticality}
              </span>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <span className="breadcrumb-item">Jurisdiction: {field.jurisdiction_code}</span>
          <span className="breadcrumb-separator">•</span>
          <span className="breadcrumb-item">Type: {field.data_type || 'N/A'}</span>
          <span className="breadcrumb-separator">•</span>
          <span className="breadcrumb-item">Owner: {field.owner_team || 'N/A'}</span>
        </nav>
      </header>

      {/* Main Content */}
      <div className="field360-content">
        {/* Left Panel - Lineage Graph */}
        <section className="field360-graph-section">
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">Lineage Graph</h2>
            </div>
            <div className="lineage-graph-container">
              <LineageGraph
                nodes={graphNodes}
                edges={graphEdges}
                onNodeClick={(nodeId: string) => {
                  // Handle node click - can be extended later
                  console.log('Node clicked:', nodeId)
                }}
              />
            </div>
          </div>
        </section>

        {/* Right Panel - Details */}
        <section className="field360-details-section">
          {/* Tab Bar */}
          <div className="tab-bar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                title={tab.label}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content-wrapper">
            {activeTab === 'overview' && (
              <div className="tab-panel">
                <div className="tab-panel-header">
                  <h3>Field Overview</h3>
                </div>
                <div className="tab-panel-content">
                  <div className="info-group">
                    <div className="info-row">
                      <label className="info-label">Internal Name</label>
                      <div className="info-value">{field.internal_field_name}</div>
                    </div>
                    <div className="info-row">
                      <label className="info-label">External Name</label>
                      <div className="info-value">{field.external_display_name}</div>
                    </div>
                    <div className="info-row">
                      <label className="info-label">Data Type</label>
                      <div className="info-value">{field.data_type || 'N/A'}</div>
                    </div>
                    <div className="info-row">
                      <label className="info-label">Category</label>
                      <div className="info-value">{field.field_category || 'N/A'}</div>
                    </div>
                    <div className="info-row">
                      <label className="info-label">Mandatory</label>
                      <div className="info-value">
                        {field.is_mandatory ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div className="info-row">
                      <label className="info-label">Status</label>
                      <div className="info-value">
                        <span className={`badge ${getStatusBadgeClass(field.status)}`}>
                          {field.status}
                        </span>
                      </div>
                    </div>
                    <div className="info-row">
                      <label className="info-label">Criticality</label>
                      <div className="info-value">
                        <span className={`badge ${getCriticalityBadgeClass(field.criticality)}`}>
                          {field.criticality}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div className="tab-panel">
                <div className="tab-panel-header">
                  <h3>Business Interpretation</h3>
                </div>
                <div className="tab-panel-content">
                  {data?.data?.data?.business_interpretation ? (
                    <p className="interpretation-text">
                      {data.data.data.business_interpretation}
                    </p>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-state-title">No Business Interpretation</p>
                      <p className="empty-state-sub">Business interpretation will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="tab-panel">
                <div className="tab-panel-header">
                  <h3>Technical Interpretation</h3>
                </div>
                <div className="tab-panel-content">
                  {data?.data?.data?.technical_interpretation ? (
                    <p className="interpretation-text">
                      {data.data.data.technical_interpretation}
                    </p>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-state-title">No Technical Interpretation</p>
                      <p className="empty-state-sub">Technical interpretation will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'xslt' && (
              <div className="tab-panel">
                <div className="tab-panel-header">
                  <h3>XSLT Drill-Down</h3>
                </div>
                <div className="tab-panel-content">
                  {data?.data?.data?.xslt_variables && data.data.data.xslt_variables.length > 0 ? (
                    <div>
                      <p className="info-label mb-2">Variables ({data.data.data.xslt_variables.length})</p>
                      <ul className="variable-list">
                        {data.data.data.xslt_variables.map((v: any, i: number) => (
                          <li key={i} className="variable-item">
                            <span className="variable-icon">🔤</span>
                            <span className="variable-name">{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-state-title">No XSLT Variables</p>
                      <p className="empty-state-sub">No XSLT variables associated with this field</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'java' && (
              <div className="tab-panel">
                <div className="tab-panel-header">
                  <h3>Java Drill-Down</h3>
                </div>
                <div className="tab-panel-content">
                  {data?.data?.data?.java_methods && data.data.data.java_methods.length > 0 ? (
                    <div>
                      <p className="info-label mb-2">Methods ({data.data.data.java_methods.length})</p>
                      <ul className="variable-list">
                        {data.data.data.java_methods.map((m: any, i: number) => (
                          <li key={i} className="variable-item">
                            <span className="variable-icon">☕</span>
                            <span className="variable-name">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-state-title">No Java Methods</p>
                      <p className="empty-state-sub">No Java methods associated with this field</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'downstream' && (
              <div className="tab-panel">
                <div className="tab-panel-header">
                  <h3>Downstream Systems</h3>
                </div>
                <div className="tab-panel-content">
                  {data?.data?.data?.downstream_systems && data.data.data.downstream_systems.length > 0 ? (
                    <div>
                      <p className="info-label mb-2">Systems ({data.data.data.downstream_systems.length})</p>
                      <ul className="variable-list">
                        {data.data.data.downstream_systems.map((s: any, i: number) => (
                          <li key={i} className="variable-item">
                            <span className="variable-icon">➡️</span>
                            <span className="variable-name">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-state-title">No Downstream Systems</p>
                      <p className="empty-state-sub">No downstream systems associated with this field</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
