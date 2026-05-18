// e2e/api/fields.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, FIELDS, JURISDICTIONS, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('GET /fields', () => {
  test('returns paginated list with TRADE_ID', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('items')
    expect(body).toHaveProperty('totalItems')
    expect(body.items.length).toBeGreaterThan(0)
    const names = body.items.map((f: any) => f.field_name)
    expect(names).toContain('TRADE_ID')
  })

  test('filters by jurisdiction JFSA', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields?jurisdiction=JFSA`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    body.items.forEach((f: any) => {
      expect(f.jurisdiction_code).toBe('JFSA')
    })
  })

  test('filters by search term TRADE', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields?search=TRADE`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.items.length).toBeGreaterThan(0)
    body.items.forEach((f: any) => {
      expect(f.field_name.toUpperCase()).toContain('TRADE')
    })
  })

  test('pagination: page 2 with pageSize 1 returns different field', async ({ request }) => {
    const res1 = await request.get(`${API_BASE}/fields?page=1&pageSize=1`, { headers: AUTH_HEADER })
    const res2 = await request.get(`${API_BASE}/fields?page=2&pageSize=1`, { headers: AUTH_HEADER })
    const body1 = await res1.json()
    const body2 = await res2.json()
    expect(body1.items[0].field_id).not.toBe(body2.items[0].field_id)
  })
})

test.describe('GET /fields/:field_id', () => {
  test('returns TRADE_ID details', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields/${FIELDS.TRADE_ID.field_id}`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.field_name).toBe('TRADE_ID')
    expect(body.data_type).toBe('STRING')
    expect(body.criticality).toBe('HIGH')
  })

  test('returns 404 for non-existent field', async ({ request }) => {
    const res = await request.get(`${API_BASE}/fields/99999`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(404)
  })
})
