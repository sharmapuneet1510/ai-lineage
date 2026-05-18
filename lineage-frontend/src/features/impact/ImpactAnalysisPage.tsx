import { useState } from 'react'

export default function ImpactAnalysisPage() {
  const [sourceType, setSourceType] = useState('FIELD')
  const [sourceValue, setSourceValue] = useState('')

  const handleRunAnalysis = () => {
    console.log('Running impact analysis for', sourceType, sourceValue)
  }

  return (
    <div className="page">
      <h1>Impact Analysis</h1>
      <div className="controls">
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          <option value="FIELD">Field</option>
          <option value="XSLT_VARIABLE">XSLT Variable</option>
          <option value="JAVA_METHOD">Java Method</option>
          <option value="XPATH">XPath</option>
        </select>
        <input type="text" placeholder="Enter source value..." value={sourceValue} onChange={(e) => setSourceValue(e.target.value)} />
        <button onClick={handleRunAnalysis}>Run Analysis</button>
      </div>
      <div className="results">
        {/* Impact results */}
      </div>
    </div>
  )
}
