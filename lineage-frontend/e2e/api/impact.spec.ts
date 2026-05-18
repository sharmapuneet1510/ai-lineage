// e2e/api/impact.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, FIELDS, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('POST /impact-analysis/run', () => {
  test('runs impact analysis for TRADE_ID field', async ({ request }) => {
    const res = await request.post(`${API_BASE}/impact-analysis/run?source_type=field&source_value=TRADE_ID`, {
      headers: AUTH_HEADER,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
  })

  test('returns 422 when source_type is missing', async ({ request }) => {
    const res = await request.post(`${API_BASE}/impact-analysis/run`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(422)
  })
})

test.describe('GET /impact-analysis/fields/:id', () => {
  test('returns impact for TRADE_ID', async ({ request }) => {
    const res = await request.get(`${API_BASE}/impact-analysis/fields/${FIELDS.TRADE_ID.field_id}`, {
      headers: AUTH_HEADER,
    })
    expect(res.status()).toBe(200)
  })
})
