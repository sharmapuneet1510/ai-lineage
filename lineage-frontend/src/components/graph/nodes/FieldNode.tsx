import { Handle, Position } from 'reactflow'

export interface FieldNodeData {
  label: string
  fieldId?: string
  jurisdiction?: string
}

export default function FieldNode({ data }: { data: FieldNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50 shadow-md min-w-max">
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-blue-900">{data.label}</div>
        {data.jurisdiction && (
          <div className="text-xs text-blue-700">{data.jurisdiction}</div>
        )}
        {data.fieldId && (
          <div className="text-xs text-gray-600">ID: {data.fieldId}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
