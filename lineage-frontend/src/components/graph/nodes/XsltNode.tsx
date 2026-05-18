import { Handle, Position, NodeProps } from 'reactflow'

export function XsltNode({ data }: NodeProps) {
  return (
    <div style={{
      background: '#f59e0b',
      color: '#1a1200',
      border: '2px solid #d97706',
      borderRadius: 8,
      padding: '8px 14px',
      minWidth: 140,
      boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#1a1200' }} />
      <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        XSLT Variable
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{data.label}</div>
      {data.subtitle && (
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{data.subtitle}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#1a1200' }} />
    </div>
  )
}
