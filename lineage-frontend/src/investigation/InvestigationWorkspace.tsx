import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Command, Sun, Moon, Printer, Maximize2, Minimize2, Clock, AlertTriangle, FileSearch,
  Menu, PanelRight,
} from 'lucide-react'
import { dataClient } from './dataClient'
import type { Field } from './types'
import { FieldSidebar } from './FieldSidebar'
import { EvidenceRail } from './EvidenceRail'
import { CommandPalette, type Command as Cmd } from './CommandPalette'
import { TabPanel, type TabId, type ViewMode } from './Tabs'
import { CritTag, timeAgo } from './ui'
import './investigation.css'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'business', label: 'Business Logic' },
  { id: 'decision', label: 'Decision Logic' },
  { id: 'journey', label: 'Data Journey' },
  { id: 'evidence', label: 'Technical Evidence' },
  { id: 'related', label: 'Related' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'history', label: 'Review History' },
  { id: 'raw', label: 'Raw Knowledge' },
]

function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) } catch { return new Set() }
  })
  const toggle = useCallback((id: string) => {
    setSet((s) => {
      const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id)
      localStorage.setItem(key, JSON.stringify([...n])); return n
    })
  }, [key])
  return [set, toggle] as const
}

export default function InvestigationWorkspace() {
  const { fieldId } = useParams()
  const navigate = useNavigate()

  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('inv-theme') as 'light' | 'dark') ?? 'light')
  const [view, setView] = useState<ViewMode>('business')
  const [tab, setTab] = useState<TabId>('overview')
  const [railTab, setRailTab] = useState<'evidence' | 'assistant'>('evidence')
  const [focusEvidence, setFocusEvidence] = useState<string | null>(null)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [navOpen, setNavOpen] = useState(false)   // sidebar drawer (narrow screens)
  const [railOpen, setRailOpen] = useState(false)  // rail drawer (narrow screens)
  const [favorites, toggleFav] = useLocalSet('inv-favorites')
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('inv-recent') ?? '[]') } catch { return [] }
  })

  const { data: fields = [] } = useQuery({ queryKey: ['inv-fields'], queryFn: () => dataClient.listFields() })

  // Default to the first field when none selected.
  useEffect(() => {
    if (!fieldId && fields.length) navigate(`/investigate/${fields[0].id}`, { replace: true })
  }, [fieldId, fields, navigate])

  const { data: field, isLoading } = useQuery({
    queryKey: ['inv-field', fieldId], queryFn: () => dataClient.getField(fieldId!), enabled: !!fieldId,
  })
  const { data: feedback = [], refetch: refetchFeedback } = useQuery({
    queryKey: ['inv-feedback', fieldId], queryFn: () => dataClient.listFeedback(fieldId!), enabled: !!fieldId,
  })
  const { data: activity = [] } = useQuery({
    queryKey: ['inv-activity', fieldId], queryFn: () => dataClient.listActivity(fieldId!), enabled: !!fieldId,
  })
  const { data: checklist = [] } = useQuery({
    queryKey: ['inv-checklist', fieldId], queryFn: () => dataClient.checklist(fieldId!), enabled: !!fieldId,
  })

  useEffect(() => { localStorage.setItem('inv-theme', theme) }, [theme])

  // Track recently viewed.
  useEffect(() => {
    if (!fieldId) return
    setRecent((r) => {
      const next = [fieldId, ...r.filter((x) => x !== fieldId)].slice(0, 6)
      localStorage.setItem('inv-recent', JSON.stringify(next)); return next
    })
  }, [fieldId])

  const selectField = useCallback((id: string) => {
    setTab('overview'); setNavOpen(false); navigate(`/investigate/${id}`)
  }, [navigate])

  const openEvidence = useCallback((id: string) => {
    setRailTab('evidence'); setRailOpen(true); setFocusEvidence(id)
    setTimeout(() => setFocusEvidence(null), 1500)
  }, [])

  // Global keyboard: Cmd/Ctrl+K palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdkOpen((o) => !o) }
      else if (e.key === 'Escape') { setCmdkOpen(false); setNavOpen(false); setRailOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commands: Cmd[] = useMemo(() => [
    { id: 'view-business', name: 'Switch to Business view', run: () => setView('business') },
    { id: 'view-technical', name: 'Switch to Technical view', run: () => setView('technical') },
    { id: 'theme', name: 'Toggle dark / light theme', hint: 'theme', run: () => setTheme((t) => t === 'dark' ? 'light' : 'dark') },
    { id: 'focus', name: 'Toggle focus mode', run: () => setFocusMode((f) => !f) },
    { id: 'print', name: 'Print / audit view', hint: 'print', run: () => window.print() },
    { id: 'assistant', name: 'Open AI assistant', run: () => { setRailTab('assistant'); setRailOpen(true) } },
    ...TABS.map((t) => ({ id: `tab-${t.id}`, name: `Go to ${t.label}`, run: () => setTab(t.id) })),
  ], [])

  const stale = field ? Date.parse(field.sourceChangedAt) > Date.parse(field.tracedAt) : false

  return (
    <div
      className={`inv ${focusMode ? 'focus-mode' : ''} ${navOpen ? 'nav-open' : ''} ${railOpen ? 'rail-open' : ''}`}
      data-theme={theme}
    >
      <div className="inv-scrim" onClick={() => { setNavOpen(false); setRailOpen(false) }} />
      <FieldSidebar
        fields={fields} activeId={fieldId} favorites={favorites} recent={recent}
        onSelect={selectField} onToggleFav={toggleFav}
      />

      <main className="inv-main">
        <div className="inv-topbar">
          <button className="inv-iconbtn btn-nav" onClick={() => setNavOpen((o) => !o)} aria-label="Toggle field list">
            <Menu size={16} />
          </button>
          <button className="inv-iconbtn" onClick={() => setCmdkOpen(true)}>
            <Command size={14} /> Command <span style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: .7 }}>⌘K</span>
          </button>
          <div className="inv-topbar__spacer" />
          <div className="viewtoggle" role="tablist" aria-label="View mode">
            <button className={view === 'business' ? 'on' : ''} onClick={() => setView('business')}>Business</button>
            <button className={view === 'technical' ? 'on' : ''} onClick={() => setView('technical')}>Technical</button>
          </div>
          <button className="inv-iconbtn" onClick={() => setFocusMode((f) => !f)} aria-label="Focus mode">
            {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button className="inv-iconbtn" onClick={() => window.print()} aria-label="Print audit view"><Printer size={15} /></button>
          <button className="inv-iconbtn" onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="inv-iconbtn btn-rail" onClick={() => setRailOpen((o) => !o)} aria-label="Toggle evidence panel">
            <PanelRight size={16} />
          </button>
        </div>

        <div className="inv-scroll">
          <div className="inv-canvas">
            {isLoading && <div className="prose">Loading field…</div>}
            {field && (
              <>
                <ExecHeader field={field} stale={stale} />
                <div className="inv-tabs" role="tablist">
                  {TABS.map((t) => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id}
                      className={`inv-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
                      {t.label}
                      {t.id === 'feedback' && feedback.length > 0 && <span className="cnt">{feedback.length}</span>}
                      {t.id === 'evidence' && <span className="cnt">{field.evidence.length}</span>}
                    </button>
                  ))}
                </div>
                <TabPanel
                  tab={tab} field={field} view={view} allFields={fields}
                  feedback={feedback} activity={activity} checklist={checklist}
                  onCite={openEvidence} onSelectField={selectField}
                  onFeedbackSubmitted={() => refetchFeedback()}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {field
        ? <EvidenceRail field={field} tab={railTab} setTab={setRailTab} focusEvidenceId={focusEvidence} />
        : <aside className="inv-rail"><div className="inv-empty"><div><div className="inv-empty__mark"><FileSearch size={26} /></div>Select a field</div></div></aside>}

      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} fields={fields} onSelectField={selectField} commands={commands} />
    </div>
  )
}

function ExecHeader({ field, stale }: { field: Field; stale: boolean }) {
  return (
    <div className="exec">
      <div className="exec__bar" />
      <div className="exec__body">
        <div className="exec__top">
          <div className="exec__title">
            <div className="eyebrow">{field.module} · {field.group}</div>
            <h1>{field.name}</h1>
            <div className="exec__names">
              <span><code>{field.internalName}</code></span>
              <span>→ <code>{field.externalName}</code></span>
              <span>{field.dataType}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <CritTag c={field.criticality} />
            <div style={{ marginTop: 8 }}>
              <span className={`freshness ${stale ? 'stale' : 'fresh'}`}>
                {stale ? <AlertTriangle size={13} /> : <Clock size={13} />}
                {stale ? 'Stale — source changed' : `Traced ${timeAgo(field.tracedAt)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="exec__facts">
          <div className="fact"><div className="fact__k">Conditions</div><div className="fact__v">{field.conditions.length} <small>branches</small></div></div>
          <div className="fact"><div className="fact__k">Transformations</div><div className="fact__v">{field.transformationCount}</div></div>
          <div className="fact"><div className="fact__k">Fallbacks</div><div className="fact__v">{field.fallbacks.length}</div></div>
          <div className="fact"><div className="fact__k">Output</div><div className="fact__v" style={{ fontSize: 13 }}>{field.outputDestination}</div></div>
          <div className="fact"><div className="fact__k">Review</div><div className="fact__v" style={{ fontSize: 13 }}>{field.reviewStatus.replace('_', ' ')}</div></div>
        </div>
      </div>
    </div>
  )
}
