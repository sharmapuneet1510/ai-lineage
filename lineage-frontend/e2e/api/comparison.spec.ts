// e2e/api/comparison.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, FIELDS, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('GET /comparison/business-concepts', () => {
  test('returns 200 with array', async ({ request }) => {
    const res = await request.get(`${API_BASE}/comparison/business-concepts`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

test.describe('POST /comparison/fields', () => {
  test('compares TRADE_ID and TRADE_TIMESTAMP', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comparison/fields`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: {
        field_ids: [FIELDS.TRADE_ID.field_id, FIELDS.TRADE_TIMESTAMP.field_id],
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
  })

  test('returns 400 for single field (need at least 2)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/comparison/fields`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: { field_ids: [FIELDS.TRADE_ID.field_id] },
    })
    expect([400, 422]).toContain(res.status())
  })
})
