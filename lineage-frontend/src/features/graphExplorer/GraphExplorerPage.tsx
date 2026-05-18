import { useState } from 'react'
import axios from 'axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function GraphExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodeType, setNodeType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery?.trim()) {
      setError('Please enter a search query')
      return
    }

    setIsLoading(true)
    setError(null)
    setSearchResults([])

    try {
      const response = await axios.post(`${API_BASE}/graph/search`, {
        query: searchQuery,
        type: nodeType || undefined,
      })
      setSearchResults(response.data?.data?.nodes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search graph')
      console.error('Search failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNodeSelect = (node: any) => {
    setSelectedNode(node)
  }

  return (
    <div className="page graph-explorer">
      <h1 className="text-3xl font-bold mb-6">Graph Explorer</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
            <select
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="Field">Field</option>
              <option value="XsltVariable">XSLT Variable</option>
              <option value="JavaMethod">Java Method</option>
              <option value="Database">Database</option>
              <option value="Table">Table</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery?.trim()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          message={error}
          onRetry={handleSearch}
        />
      )}

      {isLoading && <LoadingSpinner message="Searching graph..." />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Graph Visualization</h2>
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-600">Graph visualization would render here (React Flow or custom SVG)</p>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Search Results ({searchResults.length})</h3>
              <div className="space-y-2">
                {searchResults.map((node, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleNodeSelect(node)}
                    className={`w-full text-left px-4 py-2 rounded border transition-colors ${
                      selectedNode?.id === node.id
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-medium">{node.name}</p>
                    <p className="text-sm text-gray-600">{node.type}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedNode && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700 font-bold"
              >
                X
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="text-gray-900">{selectedNode.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <p className="text-gray-900">{selectedNode.type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">ID</p>
                <p className="text-gray-900 break-all">{selectedNode.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="text-gray-900">{selectedNode.description || 'No description'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
