// e2e/api/auth.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, USERS } from '../fixtures/seed-data'

test.describe('GET /auth/me', () => {
  test('returns user info for puneet.sharma', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`, {
      headers: { 'X-User': USERS.admin },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.username).toBe(USERS.admin)
    expect(body.role).toBe('LINEAGE_ADMIN')
  })

  test('returns 404 for unknown user', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`, {
      headers: { 'X-User': 'unknown.user' },
    })
    expect(res.status()).toBe(404)
  })
})
