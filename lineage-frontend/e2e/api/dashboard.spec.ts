// e2e/api/dashboard.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, AUTH_HEADER } from '../fixtures/seed-data'

const DASHBOARD_ENDPOINTS = [
  '/dashboard/summary',
  '/dashboard/lineage-coverage',
  '/dashboard/high-risk-fields',
  '/dashboard/recent-changes',
  '/dashboard/top-impacted-dependencies',
]

for (const endpoint of DASHBOARD_ENDPOINTS) {
  test(`GET ${endpoint} returns 200`, async ({ request }) => {
    const res = await request.get(`${API_BASE}${endpoint}`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
  })
}

test('GET /dashboard/summary has expected shape', async ({ request }) => {
  const res = await request.get(`${API_BASE}/dashboard/summary`, { headers: AUTH_HEADER })
  const body = await res.json()
  expect(body).toHaveProperty('totalFields')
  expect(body).toHaveProperty('totalJurisdictions')
})
