import { useState } from 'react'
import type { Field, FieldSummary, Feedback, ReviewEvent, FeedbackTarget } from './types'
import { Card, TrustLabel, AttributedRow, EvidenceCite, CodeBlock, timeAgo, ProvenanceLegend } from './ui'
import { DecisionTree } from './DecisionTree'
import { DataJourney } from './DataJourney'
import { dataClient } from './dataClient'

export type TabId =
  | 'overview' | 'business' | 'decision' | 'journey' | 'evidence'
  | 'related' | 'feedback' | 'history' | 'raw'

export type ViewMode = 'business' | 'technical'

interface TabsProps {
  field: Field
  view: ViewMode
  allFields: FieldSummary[]
  feedback: Feedback[]
  activity: ReviewEvent[]
  checklist: { id: string; label: string; done: boolean }[]
  onCite: (id: string) => void
  onSelectField: (id: string) => void
  onFeedbackSubmitted: () => void
}

export function TabPanel({ tab, ...p }: TabsProps & { tab: TabId }) {
  switch (tab) {
    case 'overview': return <Overview {...p} />
    case 'business': return <BusinessTech {...p} />
    case 'decision': return <Decision {...p} />
    case 'journey': return <Journey {...p} />
    case 'evidence': return <EvidenceTab {...p} />
    case 'related': return <Related {...p} />
    case 'feedback': return <FeedbackTab {...p} />
    case 'history': return <History {...p} />
    case 'raw': return <Raw {...p} />
  }
}

function Overview({ field, view, onCite }: TabsProps) {
  const explain = view === 'business' ? field.business : field.technical
  return (
    <div className="panel">
      <Card title="What this field is" right={<TrustLabel p={field.description.provenance} />}>
        <p className="prose">{field.description.text} <EvidenceCite ids={field.description.evidenceIds} onOpen={onCite} /></p>
      </Card>
      <Card title={view === 'business' ? 'In business terms' : 'In technical terms'} right={<TrustLabel p={explain.provenance} />}>
        <p className="prose">{explain.text} <EvidenceCite ids={explain.evidenceIds} onOpen={onCite} /></p>
      </Card>
      <Card title="Plain-language explanation" right={<TrustLabel p={field.layman.provenance} />}>
        <p className="prose">{field.layman.text}</p>
      </Card>
      <Card title="Provenance legend">
        <ProvenanceLegend />
      </Card>
    </div>
  )
}

function BusinessTech({ field, view, onCite }: TabsProps) {
  const main = view === 'business' ? field.business : field.technical
  return (
    <div className="panel">
      <Card title={view === 'business' ? 'Business logic' : 'Technical logic'} right={<TrustLabel p={main.provenance} />}>
        <p className="prose">{main.text} <EvidenceCite ids={main.evidenceIds} onOpen={onCite} /></p>
      </Card>
      <Card title="Conditions" right={<span className="eyebrow">{field.conditions.length} branch{field.conditions.length === 1 ? '' : 'es'}</span>}>
        {field.conditions.length
          ? <div className="attr">{field.conditions.map((c, i) => <AttributedRow key={i} a={c} onCite={onCite} />)}</div>
          : <p className="prose">No conditional logic — this field is computed unconditionally.</p>}
      </Card>
      <Card title="Transformations (ordered)">
        {field.transformations.length
          ? <div className="attr">{field.transformations.map((t, i) => <AttributedRow key={i} a={t} label={`Step ${i + 1}`} onCite={onCite} />)}</div>
          : <p className="prose">No transformations recorded.</p>}
      </Card>
      <Card title="Fallbacks">
        {field.fallbacks.length
          ? <div className="attr">{field.fallbacks.map((f, i) => <AttributedRow key={i} a={f} onCite={onCite} />)}</div>
          : <p className="prose">No fallback behaviour.</p>}
      </Card>
      <Card title="Output" right={<TrustLabel p={field.output.provenance} />}>
        <p className="prose">{field.output.text} <EvidenceCite ids={field.output.evidenceIds} onOpen={onCite} /></p>
      </Card>
    </div>
  )
}

function Decision({ field, onCite }: TabsProps) {
  return (
    <div className="panel">
      <Card title="Reconstructed decision logic" right={<span className="eyebrow">Order is significant</span>}>
        <p className="prose" style={{ marginBottom: 16 }}>
          Branches below are reconstructed from source in evaluation order. Select any branch to focus it;
          click a citation to open the exact code.
        </p>
        <DecisionTree root={field.decisionTree} onCite={onCite} />
      </Card>
    </div>
  )
}

function Journey({ field, onCite }: TabsProps) {
  return (
    <div className="panel">
      <Card title="Source → output journey">
        <DataJourney stages={field.journey} onCite={onCite} />
      </Card>
    </div>
  )
}

function EvidenceTab({ field }: TabsProps) {
  return (
    <div className="panel">
      {field.evidence.map((ev) => (
        <Card key={ev.id} title={ev.caption}
          right={<span className={`kindtag ${ev.kind}`}>{ev.kind}</span>}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{ev.file}{ev.lineStart ? ` : ${ev.lineStart}-${ev.lineEnd}` : ''}</div>
          <CodeBlock ev={ev} />
        </Card>
      ))}
    </div>
  )
}

function Related({ field, allFields, onSelectField }: TabsProps) {
  const related = field.relatedFieldIds
    .map((id) => allFields.find((f) => f.id === id))
    .filter((f): f is FieldSummary => !!f)
  return (
    <div className="panel">
      <Card title="Related fields" right={<span className="eyebrow">{related.length}</span>}>
        <div className="chips">
          {related.map((f) => (
            <button key={f.id} className="mono-chip" style={{ cursor: 'pointer' }} onClick={() => onSelectField(f.id)}>
              <span className={`crit-dot crit-${f.criticality}`} style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />
              {f.name}
            </button>
          ))}
          {related.length === 0 && <p className="prose">No related fields.</p>}
        </div>
      </Card>
    </div>
  )
}

const TARGETS: FeedbackTarget[] = ['description', 'business', 'technical', 'condition', 'transformation', 'fallback', 'output', 'missing', 'parser', 'general']

function FeedbackTab({ field, feedback, onFeedbackSubmitted }: TabsProps) {
  const [target, setTarget] = useState<FeedbackTarget>('business')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!body.trim()) return
    setBusy(true)
    await dataClient.submitFeedback({ fieldId: field.id, target, author: 'you', body })
    setBody(''); setBusy(false); onFeedbackSubmitted()
  }

  return (
    <div className="panel">
      <Card title="Submit feedback">
        <p className="prose" style={{ marginBottom: 12 }}>
          Feedback never overwrites parsed facts. It enters review and is applied only after a human verifies it.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <select value={target} onChange={(e) => setTarget(e.target.value as FeedbackTarget)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)' }}>
            {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          placeholder="Describe the correction or missing information…"
          style={{ width: '100%', padding: 11, borderRadius: 9, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13.5 }} />
        <div style={{ marginTop: 10 }}>
          <button className="inv-iconbtn primary" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        </div>
      </Card>

      <Card title="Feedback history" right={<span className="eyebrow">{feedback.length}</span>}>
        {feedback.length === 0 && <p className="prose">No feedback yet.</p>}
        {feedback.map((f) => (
          <div key={f.id} className="fb">
            <div className="fb__top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono-chip" style={{ padding: '2px 7px' }}>{f.target}</span>
                {f.conflictsWithCode && <span className="conflict-flag">Conflicts with code</span>}
              </div>
              <span className={`fbstatus ${f.status}`}>{f.status.replace('_', ' ')}</span>
            </div>
            <div className="fb__body">{f.body}</div>
            <div className="fb__meta" style={{ marginTop: 6 }}>{f.author} · {timeAgo(f.createdAt)}</div>
            {f.resolution && <div className="fb__res">{f.resolution}</div>}
          </div>
        ))}
      </Card>
    </div>
  )
}

function History({ field, activity, checklist }: TabsProps) {
  const [items, setItems] = useState(checklist)
  const toggle = (id: string) => setItems((xs) => xs.map((c) => c.id === id ? { ...c, done: !c.done } : c))
  const done = items.filter((c) => c.done).length

  return (
    <div className="panel">
      <Card title="Review checklist" right={<span className="eyebrow">{done}/{items.length}</span>}>
        {items.map((c) => (
          <label key={c.id} className={`checkitem ${c.done ? 'done' : ''}`}>
            <input type="checkbox" checked={c.done} onChange={() => toggle(c.id)} />
            {c.label}
          </label>
        ))}
      </Card>
      <Card title="Activity timeline">
        <div className="timeline">
          {activity.map((e) => (
            <div key={e.id} className="tl-ev">
              <div className="tl-ev__rail"><div className="tl-ev__dot" /><div className="tl-ev__line" /></div>
              <div className="tl-ev__body">
                <div className="tl-ev__sum">{e.summary}</div>
                <div className="tl-ev__meta">{e.actor} · {timeAgo(e.at)}{e.detail ? ` · ${e.detail}` : ''}</div>
              </div>
            </div>
          ))}
          {activity.length === 0 && <p className="prose">No recorded activity for {field.name}.</p>}
        </div>
      </Card>
    </div>
  )
}

function Raw({ field }: TabsProps) {
  const pkg = {
    ...field.canonical,
    generatedWith: field.generatedWith,
    provenanceSummary: {
      conditions: field.conditions.map((c) => c.provenance),
      explanations: [field.description.provenance, field.business.provenance, field.technical.provenance],
    },
  }
  return (
    <div className="panel">
      <Card title="Canonical field knowledge (JSON)"
        right={field.generatedWith && <span className="eyebrow">{field.generatedWith.promptId} v{field.generatedWith.promptVersion}</span>}>
        <div className="raw-json">{JSON.stringify(pkg, null, 2)}</div>
      </Card>
    </div>
  )
}
