import { useState } from 'react'
import axios from 'axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'
import { Search, Network, X, ExternalLink } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const nodeTypeColors: Record<string, string> = {
  Field: 'bg-blue-100 border-blue-300 text-blue-900',
  XsltVariable: 'bg-purple-100 border-purple-300 text-purple-900',
  XsltFile: 'bg-purple-50 border-purple-200 text-purple-800',
  XPath: 'bg-pink-100 border-pink-300 text-pink-900',
  JavaMethod: 'bg-orange-100 border-orange-300 text-orange-900',
  JavaClass: 'bg-orange-50 border-orange-200 text-orange-800',
  DownstreamSystem: 'bg-green-100 border-green-300 text-green-900',
  Database: 'bg-indigo-100 border-indigo-300 text-indigo-900',
  Table: 'bg-indigo-50 border-indigo-200 text-indigo-800',
}

export default function GraphExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodeType, setNodeType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedNeighbors, setExpandedNeighbors] = useState<any[]>([])
  const [isLoadingNeighbors, setIsLoadingNeighbors] = useState(false)

  const nodeTypeOptions = ['Field', 'XsltVariable', 'XsltFile', 'XPath', 'JavaMethod', 'JavaClass', 'DownstreamSystem', 'Database', 'Table']

  const handleSearch = async () => {
    if (!searchQuery?.trim()) {
      setError('Please enter a search query')
      return
    }

    setIsLoading(true)
    setError(null)
    setSearchResults([])
    setSelectedNode(null)
    setExpandedNeighbors([])

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

  const handleNodeSelect = async (node: any) => {
    setSelectedNode(node)
    setIsLoadingNeighbors(true)
    setExpandedNeighbors([])
    try {
      const response = await axios.get(`${API_BASE}/graph/neighbors/${node.id}`)
      setExpandedNeighbors(response.data?.data?.neighbors || [])
    } catch (err) {
      console.error('Failed to load neighbors:', err)
      setExpandedNeighbors([])
    } finally {
      setIsLoadingNeighbors(false)
    }
  }

  const nodeColor = (type: string) => nodeTypeColors[type] || 'bg-gray-100 border-gray-300 text-gray-900'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Graph Explorer</h1>
          <p className="text-lg text-slate-600">Explore lineage and dependencies in the Neo4j knowledge graph</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Search Nodes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="md:col-span-6">
              <input
                type="text"
                placeholder="Search by name, ID, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-500"
              />
            </div>

            {/* Type Filter */}
            <div className="md:col-span-3">
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="">All Types</option>
                {nodeTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <div className="md:col-span-3">
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery?.trim()}
                className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && <ErrorState message={error} onRetry={handleSearch} />}

        {/* Loading State */}
        {isLoading && <LoadingSpinner message="Searching graph nodes..." />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Canvas & Results */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {/* Canvas Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Graph Visualization</h2>
                </div>
              </div>

              {/* Canvas */}
              <div className="p-8 bg-gradient-to-b from-slate-50 to-slate-100 min-h-[400px] border-b border-slate-200">
                {!searchResults.length ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <Network className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No graph visualization yet</p>
                    <p className="text-slate-400 text-sm mt-1">React Flow integration for interactive graph rendering</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">Search Results ({searchResults.length})</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {searchResults.map((node, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleNodeSelect(node)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            selectedNode?.id === node.id
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm ${nodeColor(node.type)}`
                          }`}
                        >
                          <p className="font-semibold text-sm truncate">{node.name}</p>
                          <p className="text-xs text-slate-600 mt-1">{node.type}</p>
                          {node.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{node.description}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Node Details Panel */}
          {selectedNode ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit sticky top-6">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Node Details</h3>
                <button
                  onClick={() => {
                    setSelectedNode(null)
                    setExpandedNeighbors([])
                  }}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[600px]">
                {/* Node Type Badge */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Type</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${nodeColor(selectedNode.type)}`}>
                    {selectedNode.type}
                  </span>
                </div>

                {/* Name */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Name</p>
                  <p className="text-sm font-medium text-slate-900 break-words">{selectedNode.name || 'N/A'}</p>
                </div>

                {/* ID */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">ID</p>
                  <p className="text-xs text-slate-700 break-all font-mono bg-slate-50 p-2 rounded">{selectedNode.id || 'N/A'}</p>
                </div>

                {/* Description */}
                {selectedNode.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Description</p>
                    <p className="text-sm text-slate-700 line-clamp-3">{selectedNode.description}</p>
                  </div>
                )}

                {/* Properties */}
                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Properties</p>
                    <div className="space-y-2">
                      {Object.entries(selectedNode.properties).map(([key, value]: any) => (
                        <div key={key} className="bg-slate-50 p-2 rounded text-xs">
                          <p className="font-medium text-slate-700">{key}</p>
                          <p className="text-slate-600 break-words">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Neighbors */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    {isLoadingNeighbors ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                    )}
                    <p className="text-xs font-semibold text-slate-600 uppercase">
                      Connected Nodes ({expandedNeighbors.length})
                    </p>
                  </div>

                  {expandedNeighbors.length > 0 ? (
                    <div className="space-y-2">
                      {expandedNeighbors.map((neighbor, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleNodeSelect(neighbor)}
                          className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                          <p className="text-xs font-semibold text-slate-900 truncate">{neighbor.name}</p>
                          <p className="text-xs text-slate-600">{neighbor.type}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No connected nodes</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 h-fit sticky top-6">
              <div className="text-center py-8">
                <Network className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Select a node to view details</p>
                <p className="text-slate-400 text-sm mt-1">Search results will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
