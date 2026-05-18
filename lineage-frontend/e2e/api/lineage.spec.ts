// e2e/api/lineage.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, FIELDS, AUTH_HEADER } from '../fixtures/seed-data'

const FIELD_ID = FIELDS.TRADE_ID.field_id

test.describe('GET /fields/:id/xslt-drilldown', () => {
  test('returns 200 for TRADE_ID', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields/${FIELD_ID}/xslt-drilldown`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
  })
})

test.describe('GET /fields/:id/java-drilldown', () => {
  test('returns 200 for TRADE_ID', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields/${FIELD_ID}/java-drilldown`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
  })
})

test.describe('GET /fields/:id/downstream/systems', () => {
  test('returns 200 for TRADE_ID', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields/${FIELD_ID}/downstream/systems`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

test.describe('GET /fields/:id/used-by', () => {
  test('returns 200 for TRADE_ID', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields/${FIELD_ID}/used-by`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
