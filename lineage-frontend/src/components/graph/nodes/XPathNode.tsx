import { Handle, Position, NodeProps } from 'reactflow'

export function XPathNode({ data }: NodeProps) {
  return (
    <div style={{
      background: '#00b96b',
      color: '#fff',
      border: '2px solid #009e5a',
      borderRadius: 8,
      padding: '8px 14px',
      minWidth: 140,
      boxShadow: '0 2px 8px rgba(0,185,107,0.3)',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#fff' }} />
      <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        XPath
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#fff' }} />
    </div>
  )
}
