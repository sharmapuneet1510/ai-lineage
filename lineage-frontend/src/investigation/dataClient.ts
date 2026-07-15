import axios from 'axios'
import type { Field, FieldSummary, Feedback, ReviewEvent, ChatMessage } from './types'
import {
  FIELDS, FIELD_SUMMARIES, FEEDBACK, ACTIVITY, CHECKLIST_TEMPLATE,
} from './fixtures'

// Config-driven data source (CLAUDE_INSTRUCTIONS.md §6/§15): the entire UI is
// demonstrable and testable against the mock without any external dependency.
// Set VITE_DATA_MODE=api to route to the FastAPI backend instead.
const MODE = (import.meta.env.VITE_DATA_MODE ?? 'mock') as 'mock' | 'api'
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

export interface InvestigationClient {
  listFields(): Promise<FieldSummary[]>
  getField(id: string): Promise<Field | undefined>
  listFeedback(fieldId: string): Promise<Feedback[]>
  submitFeedback(fb: Omit<Feedback, 'id' | 'createdAt' | 'status'>): Promise<Feedback>
  listActivity(fieldId: string): Promise<ReviewEvent[]>
  checklist(fieldId: string): Promise<{ id: string; label: string; done: boolean }[]>
  ask(fieldId: string, question: string): Promise<ChatMessage>
}

// ----- Mock implementation ------------------------------------------------

const feedbackStore: Feedback[] = [...FEEDBACK]

/** Deterministic, grounded mock LLM. Never invents facts — it quotes evidence. */
function mockAnswer(field: Field, question: string): ChatMessage {
  const q = question.toLowerCase()
  let text: string
  let evidenceIds: string[] = []

  if (/(higher|above|exceed).*(list|sticker)/.test(q) || /never.*(higher|above)/.test(q)) {
    text = `No. Every branch either keeps the list price or reduces it, and the fallback guard resets any null/negative result back to the list price — so ${field.name} is never above the list price.`
    evidenceIds = ['ev-ep-1']
  } else if (/partner.*promo|promo.*partner/.test(q)) {
    text = `The PARTNER branch returns early with the negotiated contract price, so the promotion branch is never reached for partner customers. Promotions only apply to non-partner customers.`
    evidenceIds = ['ev-ep-1']
  } else if (/round/.test(q)) {
    text = `The value is rounded HALF_UP to 2 decimal places at the end of resolveEffectiveUnitPrice, before it is mapped into the report.`
    evidenceIds = ['ev-ep-1']
  } else if (/downstream|report|consume|where.*(report|output|go)/.test(q)) {
    text = `${field.name} is mapped by order-line.xsl into the <UnitPrice> element and validated by order-report.xsd, then emitted to ${field.outputDestination}.`
    evidenceIds = field.evidence.filter((e) => e.kind === 'xslt' || e.kind === 'xsd').map((e) => e.id)
  } else if (/how.*calculat|comput|deriv/.test(q)) {
    text = field.technical.text
    evidenceIds = field.technical.evidenceIds ?? []
  } else if (/feed|input|source|depend/.test(q)) {
    text = `${field.name} is derived from ${field.journey.find((j) => j.kind === 'source')?.title ?? 'its source inputs'}. Related fields: ${field.relatedFieldIds.join(', ')}.`
    evidenceIds = field.journey.filter((j) => j.kind === 'source').flatMap((j) => j.evidenceIds)
  } else {
    text = `Here is what the code shows for ${field.name}: ${field.business.text}`
    evidenceIds = field.business.evidenceIds ?? []
  }

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    text,
    evidenceIds,
    suggestedFollowups: field.suggestedQuestions.filter((s) => s.toLowerCase() !== q).slice(0, 3),
  }
}

const mockClient: InvestigationClient = {
  async listFields() { await delay(); return FIELD_SUMMARIES },
  async getField(id) { await delay(); return FIELDS.find((f) => f.id === id) },
  async listFeedback(fieldId) { await delay(); return feedbackStore.filter((f) => f.fieldId === fieldId) },
  async submitFeedback(fb) {
    await delay()
    const created: Feedback = { ...fb, id: `fb-${Date.now()}`, createdAt: new Date().toISOString(), status: 'SUBMITTED' }
    feedbackStore.unshift(created)
    return created
  },
  async listActivity(fieldId) { await delay(); return ACTIVITY.filter((e) => e.fieldId === fieldId) },
  async checklist() { await delay(); return CHECKLIST_TEMPLATE.map((c) => ({ ...c })) },
  async ask(fieldId, question) {
    await delay(280)
    const field = FIELDS.find((f) => f.id === fieldId)
    if (!field) return { id: `msg-${Date.now()}`, role: 'assistant', text: 'Select a field first.' }
    return mockAnswer(field, question)
  },
}

// ----- API implementation (integration point for the FastAPI backend) -----

const apiClient: InvestigationClient = {
  async listFields() {
    const { data } = await axios.get(`${API_BASE}/fields`, { params: { pageSize: 500 } })
    return (data?.data?.items ?? data?.data ?? []) as FieldSummary[]
  },
  async getField(id) {
    const { data } = await axios.get(`${API_BASE}/fields/${id}`)
    return data?.data as Field
  },
  async listFeedback(fieldId) {
    const { data } = await axios.get(`${API_BASE}/fields/${fieldId}/feedback`)
    return (data?.data ?? []) as Feedback[]
  },
  async submitFeedback(fb) {
    const { data } = await axios.post(`${API_BASE}/fields/${fb.fieldId}/feedback`, fb)
    return data?.data as Feedback
  },
  async listActivity(fieldId) {
    const { data } = await axios.get(`${API_BASE}/fields/${fieldId}/activity`)
    return (data?.data ?? []) as ReviewEvent[]
  },
  async checklist(fieldId) {
    const { data } = await axios.get(`${API_BASE}/fields/${fieldId}/review/checklist`)
    return data?.data ?? []
  },
  async ask(fieldId, question) {
    const { data } = await axios.post(`${API_BASE}/chat`, { fieldId, question })
    return data?.data as ChatMessage
  },
}

export const dataClient: InvestigationClient = MODE === 'api' ? apiClient : mockClient
export const DATA_MODE = MODE
