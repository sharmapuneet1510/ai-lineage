import { useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { FieldNode } from './nodes/FieldNode'
import { XsltNode } from './nodes/XsltNode'
import { XPathNode } from './nodes/XPathNode'
import { JavaNode } from './nodes/JavaNode'

const NODE_TYPES = {
  field: FieldNode,
  xslt: XsltNode,
  xpath: XPathNode,
  java: JavaNode,
}

interface LineageData {
  field?: any
  xslt_variables?: any[]
  java_methods?: any[]
  downstream_systems?: any[]
}

interface LineageGraphProps {
  data: LineageData
  height?: number
}

export function LineageGraph({ data, height = 420 }: LineageGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    if (!data?.field) return { nodes, edges }

    const fieldId = `field-${data.field.field_id ?? 'main'}`

    // Main field node (center)
    nodes.push({
      id: fieldId,
      type: 'field',
      position: { x: 400, y: 160 },
      data: {
        label: data.field.internal_field_name,
        subtitle: data.field.jurisdiction_code,
        type: 'FIELD',
      },
    })

    // XSLT variable nodes (left of field)
    const xsltVars = data.xslt_variables ?? []
    xsltVars.forEach((v: any, i: number) => {
      const id = `xslt-${i}`
      nodes.push({
        id,
        type: 'xslt',
        position: { x: 160, y: 60 + i * 120 },
        data: { label: v.variable_name ?? v.name ?? `Variable ${i+1}`, subtitle: v.xslt_file },
      })
      edges.push({
        id: `e-${id}-${fieldId}`,
        source: id,
        target: fieldId,
        animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 2 },
        label: 'produces',
        labelStyle: { fontSize: 10, fill: '#667085' },
      })
    })

    // Java method nodes (below field)
    const javaMethods = data.java_methods ?? []
    javaMethods.forEach((m: any, i: number) => {
      const id = `java-${i}`
      nodes.push({
        id,
        type: 'java',
        position: { x: 640, y: 60 + i * 120 },
        data: { label: m.method_name ?? m.name ?? `Method ${i+1}`, subtitle: m.class_name },
      })
      edges.push({
        id: `e-${fieldId}-${id}`,
        source: fieldId,
        target: id,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        label: 'used by',
        labelStyle: { fontSize: 10, fill: '#667085' },
      })
    })

    // If nothing, show placeholder edge
    if (xsltVars.length === 0 && javaMethods.length === 0) {
      const srcId = 'src-data'
      nodes.push({
        id: srcId,
        type: 'xpath',
        position: { x: 100, y: 160 },
        data: { label: '/source/data' },
      })
      edges.push({
        id: `e-src-field`,
        source: srcId,
        target: fieldId,
        animated: true,
        style: { stroke: '#00b96b', strokeWidth: 2 },
      })
    }

    return { nodes, edges }
  }, [data])

  return (
    <div style={{ width: '100%', height, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fafbff' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} style={{ bottom: 8, right: 8, left: 'auto' }} />
        <MiniMap
          nodeColor={n => {
            if (n.type === 'field') return '#1267e8'
            if (n.type === 'xslt') return '#f59e0b'
            if (n.type === 'xpath') return '#00b96b'
            return '#8b5cf6'
          }}
          style={{ bottom: 8, left: 8, width: 120, height: 80 }}
        />
      </ReactFlow>
    </div>
  )
}
