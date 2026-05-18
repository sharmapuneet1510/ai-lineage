// e2e/api/health.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE } from '../fixtures/seed-data'

test.describe('GET /health', () => {
  test('returns 200 with status ok', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})

test.describe('GET /health/dependencies', () => {
  test('returns 200 with mssql and neo4j keys', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/dependencies`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('mssql')
    expect(body).toHaveProperty('neo4j')
  })
})
