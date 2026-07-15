import { useEffect, useMemo, useRef, useState } from 'react'
import type { FieldSummary } from './types'
import { CornerDownLeft } from 'lucide-react'

export interface Command {
  id: string
  name: string
  hint?: string
  run: () => void
}

export function CommandPalette({
  open, onClose, fields, onSelectField, commands,
}: {
  open: boolean
  onClose: () => void
  fields: FieldSummary[]
  onSelectField: (id: string) => void
  commands: Command[]
}) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10) } }, [open])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const cmds = commands
      .filter((c) => !term || c.name.toLowerCase().includes(term))
      .map((c) => ({ type: 'cmd' as const, id: c.id, name: c.name, hint: c.hint, run: c.run }))
    const flds = fields
      .filter((f) => !term || `${f.name} ${f.internalName}`.toLowerCase().includes(term))
      .slice(0, 8)
      .map((f) => ({ type: 'field' as const, id: f.id, name: f.name, hint: f.internalName, run: () => onSelectField(f.id) }))
    return [...cmds, ...flds]
  }, [q, commands, fields, onSelectField])

  useEffect(() => { setIdx(0) }, [q])

  if (!open) return null

  const activate = (i: number) => { results[i]?.run(); onClose() }

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <input
          ref={inputRef} className="cmdk__input" placeholder="Search fields or run a command…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') { e.preventDefault(); activate(idx) }
            else if (e.key === 'Escape') onClose()
          }}
        />
        <div className="cmdk__list">
          {results.length === 0 && <div className="cmdk__group">No matches</div>}
          {results.map((r, i) => (
            <div key={`${r.type}-${r.id}`} className={`cmdk__item ${i === idx ? 'on' : ''}`}
              onMouseEnter={() => setIdx(i)} onClick={() => activate(i)}>
              <span className="hint" style={{ minWidth: 44, textTransform: 'uppercase' }}>{r.type}</span>
              <span className="nm">{r.name}</span>
              {r.hint && <span className="hint">{r.hint}</span>}
              {i === idx && <CornerDownLeft size={13} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
