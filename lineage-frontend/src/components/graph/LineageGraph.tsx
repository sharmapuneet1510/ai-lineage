import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import FieldNode from './nodes/FieldNode'
import XsltNode from './nodes/XsltNode'
import XPathNode from './nodes/XPathNode'
import JavaNode from './nodes/JavaNode'

export interface LineageGraphProps {
  nodes: Node[]
  edges: Edge[]
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

const nodeTypes: NodeTypes = {
  field: FieldNode,
  xslt: XsltNode,
  xpath: XPathNode,
  java: JavaNode,
}

export default function LineageGraph({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: LineageGraphProps) {
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id)
  }

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    onEdgeClick?.(edge.id)
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
