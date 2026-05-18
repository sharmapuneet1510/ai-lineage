// e2e/api/lookups.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, AUTH_HEADER } from '../fixtures/seed-data'

const LOOKUP_ENDPOINTS = [
  '/lookups/jurisdictions',
  '/lookups/criticalities',
  '/lookups/statuses',
  '/lookups/source-types',
  '/lookups/node-types',
]

for (const endpoint of LOOKUP_ENDPOINTS) {
  test(`GET ${endpoint} returns 200 with array`, async ({ request }) => {
    const res = await request.get(`${API_BASE}${endpoint}`, { headers: AUTH_HEADER })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
}
