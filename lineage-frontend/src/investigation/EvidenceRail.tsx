import { useEffect, useRef, useState } from 'react'
import type { Field, ChatMessage } from './types'
import { CodeBlock } from './ui'
import { dataClient } from './dataClient'
import { FileSearch, Sparkles, Send, ChevronDown, ChevronRight } from 'lucide-react'

export function EvidenceRail({
  field, tab, setTab, focusEvidenceId,
}: {
  field: Field
  tab: 'evidence' | 'assistant'
  setTab: (t: 'evidence' | 'assistant') => void
  focusEvidenceId?: string | null
}) {
  return (
    <aside className="inv-rail">
      <div className="inv-rail__tabs">
        <button className={`inv-rail__tab ${tab === 'evidence' ? 'on' : ''}`} onClick={() => setTab('evidence')}>
          <FileSearch size={15} /> Evidence
        </button>
        <button className={`inv-rail__tab ${tab === 'assistant' ? 'on' : ''}`} onClick={() => setTab('assistant')}>
          <Sparkles size={15} /> Assistant
        </button>
      </div>
      <div className="inv-rail__body">
        {tab === 'evidence'
          ? <EvidenceInspector field={field} focusId={focusEvidenceId} />
          : <AiAssistant field={field} />}
      </div>
    </aside>
  )
}

function EvidenceInspector({ field, focusId }: { field: Field; focusId?: string | null }) {
  const [open, setOpen] = useState<Set<string>>(new Set(field.evidence.slice(0, 1).map((e) => e.id)))
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!focusId) return
    setOpen((s) => new Set(s).add(focusId))
    const el = refs.current[focusId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusId])

  const toggle = (id: string) =>
    setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div>
      {field.evidence.map((ev) => {
        const isOpen = open.has(ev.id)
        return (
          <div key={ev.id} className="evcard" ref={(el) => { refs.current[ev.id] = el }}
            style={focusId === ev.id ? { background: 'var(--gold-soft)' } : undefined}>
            <div className="evcard__head" onClick={() => toggle(ev.id)}>
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <span className={`kindtag ${ev.kind}`}>{ev.kind}</span>
              <div className="evcard__file">
                <div className="cap">{ev.caption}</div>
                <div className="path">{ev.file}{ev.lineStart ? ` : ${ev.lineStart}-${ev.lineEnd}` : ''}</div>
              </div>
            </div>
            {isOpen && <div style={{ padding: '0 12px 14px' }}><CodeBlock ev={ev} /></div>}
          </div>
        )
      })}
    </div>
  )
}

function AiAssistant({ field }: { field: Field }) {
  const [log, setLog] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLog([]) }, [field.id])
  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight) }, [log, busy])

  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    setInput('')
    setLog((l) => [...l, { id: `u-${Date.now()}`, role: 'user', text: question }])
    setBusy(true)
    const answer = await dataClient.ask(field.id, question)
    setLog((l) => [...l, answer])
    setBusy(false)
  }

  const suggestions = log.length
    ? (log[log.length - 1].suggestedFollowups ?? [])
    : field.suggestedQuestions

  return (
    <div className="chat">
      <div className="chat__log" ref={logRef}>
        {log.length === 0 && (
          <div className="prose" style={{ fontSize: 13 }}>
            Ask anything about <strong>{field.name}</strong>. Answers are grounded in parsed
            evidence — the assistant never invents implementation logic.
          </div>
        )}
        {log.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg__b">{m.text}</div>
          </div>
        ))}
        {busy && <div className="msg assistant"><div className="msg__b">Tracing evidence…</div></div>}
      </div>

      {suggestions.length > 0 && (
        <div className="chat__suggest">
          {suggestions.map((s) => (
            <button key={s} className="suggest-btn" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat__input">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="Ask about this field…" aria-label="Ask the assistant"
        />
        <button className="chat__send" onClick={() => ask(input)} aria-label="Send"><Send size={16} /></button>
      </div>
    </div>
  )
}
