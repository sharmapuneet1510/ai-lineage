import { Handle, Position, NodeProps } from 'reactflow'

export function JavaNode({ data }: NodeProps) {
  return (
    <div style={{
      background: '#8b5cf6',
      color: '#fff',
      border: '2px solid #7c3aed',
      borderRadius: 8,
      padding: '8px 14px',
      minWidth: 140,
      boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Java Method
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{data.label}</div>
      {data.subtitle && (
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{data.subtitle}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  )
}
