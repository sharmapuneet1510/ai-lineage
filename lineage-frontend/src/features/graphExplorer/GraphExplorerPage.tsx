import { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function GraphExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodeType, setNodeType] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery) return

    setIsLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/graph/search`, {
        query: searchQuery,
        type: nodeType || undefined,
      })
      console.log('Search results:', response.data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNodeSelect = (node: any) => {
    setSelectedNode(node)
  }

  return (
    <div className="page graph-explorer">
      <h1>Graph Explorer</h1>

      <div className="controls">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>

        <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
          <option value="">All Types</option>
          <option value="Field">Field</option>
          <option value="XsltVariable">XSLT Variable</option>
          <option value="JavaMethod">Java Method</option>
          <option value="Database">Database</option>
          <option value="Table">Table</option>
        </select>
      </div>

      <div className="graph-container">
        <div className="graph-canvas">
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            Graph visualization would render here (React Flow or custom SVG)
          </p>
        </div>

        {selectedNode && (
          <div className="node-detail-drawer">
            <div className="drawer-header">
              <h3>Node Details</h3>
              <button onClick={() => setSelectedNode(null)}>Close</button>
            </div>
            <div className="drawer-content">
              <p><strong>Name:</strong> {selectedNode.name || 'N/A'}</p>
              <p><strong>Type:</strong> {selectedNode.type || 'N/A'}</p>
              <p><strong>ID:</strong> {selectedNode.id || 'N/A'}</p>
              <p><strong>Description:</strong> {selectedNode.description || 'No description'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
