// e2e/api/search.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('GET /search/global', () => {
  test('returns results for TRADE', async ({ request }) => {
    const res = await request.get(`${API_BASE}/search/global?q=TRADE`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
  })

  test('returns results for JFSA', async ({ request }) => {
    const res = await request.get(`${API_BASE}/search/global?q=JFSA`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
  })

  test('returns 422 when q is empty', async ({ request }) => {
    const res = await request.get(`${API_BASE}/search/global?q=`, { headers: AUTH_HEADER })
    expect([400, 422]).toContain(res.status())
  })
})
