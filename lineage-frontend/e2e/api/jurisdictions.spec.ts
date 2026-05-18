// e2e/api/jurisdictions.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, JURISDICTIONS, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('GET /jurisdictions', () => {
  test('returns list including JFSA, MAS, ASIC', async ({ request }) => {
    const res = await request.get(`${API_BASE}/jurisdictions`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const codes = body.map((j: any) => j.jurisdiction_code)
    expect(codes).toContain('JFSA')
    expect(codes).toContain('MAS')
    expect(codes).toContain('ASIC')
  })
})

test.describe('GET /jurisdictions/:code', () => {
  test('returns JFSA details', async ({ request }) => {
    const res = await request.get(`${API_BASE}/jurisdictions/JFSA`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.jurisdiction_code).toBe('JFSA')
    expect(body.jurisdiction_name).toBe(JURISDICTIONS.JFSA.name)
  })

  test('returns 404 for unknown jurisdiction', async ({ request }) => {
    const res = await request.get(`${API_BASE}/jurisdictions/UNKNOWN`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(404)
  })
})
