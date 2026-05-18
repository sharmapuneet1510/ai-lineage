import { Handle, Position } from 'reactflow'

export interface JavaNodeData {
  label: string
  className?: string
  methodName?: string
}

export default function JavaNode({ data }: { data: JavaNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-purple-500 bg-purple-50 shadow-md min-w-max">
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-purple-900">{data.label}</div>
        {data.className && (
          <div className="text-xs text-purple-700">Class: {data.className}</div>
        )}
        {data.methodName && (
          <div className="text-xs text-gray-600">Method: {data.methodName}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
