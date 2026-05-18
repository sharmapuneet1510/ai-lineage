import { useState } from 'react'

export default function FieldComparisonPage() {
  const [jurisdictions, setJurisdictions] = useState<string[]>([])

  return (
    <div className="page">
      <h1>Field Comparison</h1>
      <div className="selectors">
        <input type="text" placeholder="Select business concept..." />
        <input type="text" placeholder="Select jurisdictions..." />
        <button>Compare</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Attribute</th>
            {jurisdictions.map(j => <th key={j}>{j}</th>)}
          </tr>
        </thead>
        <tbody>
          {/* Results */}
        </tbody>
      </table>
    </div>
  )
}
