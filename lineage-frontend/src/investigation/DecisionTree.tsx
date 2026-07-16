import { useState } from 'react'
import type { DecisionNode } from './types'
import { TrustLabel, EvidenceCite } from './ui'

function Node({
  node, selected, onSelect, onCite, root,
}: {
  node: DecisionNode; selected: string | null
  onSelect: (id: string) => void; onCite: (id: string) => void; root?: boolean
}) {
  return (
    <div className="dnode">
      <div
        className={`dnode__card ${selected === node.id ? 'sel' : ''}`}
        onClick={() => onSelect(node.id)}
        role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(node.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          {node.condition
            ? <span className="dnode__cond">if ({node.condition})</span>
            : <span className="eyebrow">{root ? 'Entry' : 'Default branch'}</span>}
          <TrustLabel p={node.provenance} short />
        </div>
        <div className="dnode__label">{node.label}</div>
        {node.outcome && (
          <div className="dnode__outcome">→ <b>{node.outcome}</b><EvidenceCite ids={node.evidenceIds} onOpen={onCite} /></div>
        )}
      </div>
      {node.children?.map((c) => (
        <Node key={c.id} node={c} selected={selected} onSelect={onSelect} onCite={onCite} />
      ))}
    </div>
  )
}

export function DecisionTree({ root, onCite }: { root: DecisionNode; onCite: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="dtree dtree__root">
      <Node node={root} selected={selected} onSelect={setSelected} onCite={onCite} root />
    </div>
  )
}
