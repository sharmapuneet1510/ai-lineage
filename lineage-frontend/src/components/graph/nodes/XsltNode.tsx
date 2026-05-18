import { Handle, Position } from 'reactflow'

export interface XsltNodeData {
  label: string
  variableName?: string
  template?: string
}

export default function XsltNode({ data }: { data: XsltNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-yellow-500 bg-yellow-50 shadow-md min-w-max">
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-yellow-900">{data.label}</div>
        {data.variableName && (
          <div className="text-xs text-yellow-700">Var: {data.variableName}</div>
        )}
        {data.template && (
          <div className="text-xs text-gray-600">Template: {data.template}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
