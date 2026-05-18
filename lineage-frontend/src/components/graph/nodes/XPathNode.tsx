import { Handle, Position } from 'reactflow'

export interface XPathNodeData {
  label: string
  expression?: string
  source?: string
}

export default function XPathNode({ data }: { data: XPathNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-green-500 bg-green-50 shadow-md min-w-max">
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-green-900">{data.label}</div>
        {data.expression && (
          <div className="text-xs text-green-700 font-mono">Expr: {data.expression}</div>
        )}
        {data.source && (
          <div className="text-xs text-gray-600">Source: {data.source}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
