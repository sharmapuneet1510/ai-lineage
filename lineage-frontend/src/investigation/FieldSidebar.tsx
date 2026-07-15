import { useMemo, useState } from 'react'
import type { FieldSummary } from './types'
import { Search, Star, GitBranch, LifeBuoy } from 'lucide-react'

type Filter = 'all' | 'critical' | 'conditions' | 'fallback' | 'favorites' | 'unreviewed'

export function FieldSidebar({
  fields, activeId, favorites, recent, onSelect, onToggleFav,
}: {
  fields: FieldSummary[]
  activeId?: string
  favorites: Set<string>
  recent: string[]
  onSelect: (id: string) => void
  onToggleFav: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return fields.filter((f) => {
      if (term && !(`${f.name} ${f.internalName} ${f.module} ${f.group}`.toLowerCase().includes(term))) return false
      switch (filter) {
        case 'critical': return f.criticality === 'CRITICAL' || f.criticality === 'HIGH'
        case 'conditions': return f.hasConditions
        case 'fallback': return f.hasFallback
        case 'favorites': return favorites.has(f.id)
        case 'unreviewed': return f.reviewStatus === 'UNREVIEWED' || f.reviewStatus === 'FLAGGED'
        default: return true
      }
    })
  }, [fields, q, filter, favorites])

  const groups = useMemo(() => {
    const m = new Map<string, FieldSummary[]>()
    for (const f of filtered) {
      if (!m.has(f.group)) m.set(f.group, [])
      m.get(f.group)!.push(f)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const recentFields = recent
    .map((id) => fields.find((f) => f.id === id))
    .filter((f): f is FieldSummary => !!f && (filter === 'all'))

  const chip = (v: Filter, label: string) => (
    <button className="inv-chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>{label}</button>
  )

  return (
    <aside className="inv-sidebar">
      <div className="inv-sidebar__head">
        <div className="inv-brand">
          <div className="inv-brand__mark">L</div>
          <div>
            <div className="inv-brand__name">Lineage</div>
            <div className="inv-brand__sub">Field Investigation</div>
          </div>
        </div>
        <div className="inv-search-wrap">
          <Search size={15} />
          <input
            className="inv-search" placeholder="Search fields…"
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search fields"
          />
        </div>
      </div>

      <div className="inv-filters">
        {chip('all', 'All')}
        {chip('critical', 'Critical')}
        {chip('conditions', 'Conditional')}
        {chip('fallback', 'Fallback')}
        {chip('favorites', '★ Favorites')}
        {chip('unreviewed', 'Unreviewed')}
      </div>

      <div className="inv-list">
        {recentFields.length > 0 && (
          <>
            <div className="inv-group-label"><span>Recently viewed</span></div>
            {recentFields.slice(0, 3).map((f) => (
              <Row key={`r-${f.id}`} f={f} active={f.id === activeId} fav={favorites.has(f.id)}
                onSelect={onSelect} onToggleFav={onToggleFav} />
            ))}
          </>
        )}

        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="inv-group-label"><span>{group}</span><span>{items.length}</span></div>
            {items.map((f) => (
              <Row key={f.id} f={f} active={f.id === activeId} fav={favorites.has(f.id)}
                onSelect={onSelect} onToggleFav={onToggleFav} />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '24px 12px', color: 'var(--chrome-text-dim)', fontSize: 13, textAlign: 'center' }}>
            No fields match. Try clearing filters.
          </div>
        )}
      </div>

      <div className="inv-sidebar__foot">
        <span>{filtered.length} of {fields.length} fields</span>
        <span>{favorites.size} ★</span>
      </div>
    </aside>
  )
}

function Row({
  f, active, fav, onSelect, onToggleFav,
}: {
  f: FieldSummary; active: boolean; fav: boolean
  onSelect: (id: string) => void; onToggleFav: (id: string) => void
}) {
  return (
    <div className={`inv-fieldrow ${active ? 'active' : ''}`} onClick={() => onSelect(f.id)}
      role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect(f.id)}>
      <div className="inv-fieldrow__top">
        <span className={`crit-dot crit-${f.criticality}`} title={f.criticality} />
        <span className="inv-fieldrow__name">{f.name}</span>
        <button
          className={`inv-star ${fav ? 'on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(f.id) }}
          aria-label={fav ? 'Remove favorite' : 'Add favorite'}
        >
          <Star size={14} fill={fav ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="inv-fieldrow__meta">
        <span className="inv-fieldrow__code">{f.internalName}</span>
        {f.hasConditions && <GitBranch size={12} />}
        {f.hasFallback && <LifeBuoy size={12} />}
      </div>
    </div>
  )
}
