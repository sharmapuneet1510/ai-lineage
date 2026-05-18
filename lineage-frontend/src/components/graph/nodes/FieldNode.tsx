import { Handle, Position, NodeProps } from 'reactflow'

export function FieldNode({ data }: NodeProps) {
  return (
    <div style={{
      background: '#1267e8',
      color: '#fff',
      border: '2px solid #0e55cc',
      borderRadius: 8,
      padding: '8px 14px',
      minWidth: 140,
      boxShadow: '0 2px 8px rgba(18,103,232,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {data.type ?? 'FIELD'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{data.label}</div>
      {data.subtitle && (
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{data.subtitle}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  )
}
