import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fieldApi } from './fieldApi'
import { useState } from 'react'

export default function Field360Page() {
  const { fieldId } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const { data, isLoading, error } = useQuery({
    queryKey: ['field', fieldId],
    queryFn: () => fieldApi.getField(Number(fieldId)),
  })

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error loading field</p>

  const field = data?.data?.data?.field

  return (
    <div className="page">
      <div className="field-header">
        <h1>{field?.business_name || field?.internal_field_name}</h1>
        <p>{field?.jurisdiction_code}</p>
      </div>

      <div className="tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'business' ? 'active' : ''} onClick={() => setActiveTab('business')}>Business</button>
        <button className={activeTab === 'technical' ? 'active' : ''} onClick={() => setActiveTab('technical')}>Technical</button>
        <button className={activeTab === 'xslt' ? 'active' : ''} onClick={() => setActiveTab('xslt')}>XSLT</button>
        <button className={activeTab === 'java' ? 'active' : ''} onClick={() => setActiveTab('java')}>Java</button>
        <button className={activeTab === 'downstream' ? 'active' : ''} onClick={() => setActiveTab('downstream')}>Downstream</button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && <div><p>Data Type: {field?.data_type}</p><p>Criticality: {field?.criticality}</p></div>}
        {activeTab === 'business' && <div><p>{data?.data?.data?.business_interpretation}</p></div>}
        {activeTab === 'technical' && <div><p>{data?.data?.data?.technical_interpretation}</p></div>}
        {activeTab === 'xslt' && <div><p>XSLT Variables: {data?.data?.data?.xslt_variables?.length || 0}</p></div>}
        {activeTab === 'java' && <div><p>Java Methods: {data?.data?.data?.java_methods?.length || 0}</p></div>}
        {activeTab === 'downstream' && <div><p>Downstream Systems: {data?.data?.data?.downstream_systems?.length || 0}</p></div>}
      </div>
    </div>
  )
}
