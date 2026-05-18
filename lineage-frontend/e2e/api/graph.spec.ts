// e2e/api/graph.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('POST /graph/search', () => {
  test('searches for v_trade_id variable', async ({ request }) => {
    const res = await request.post(`${API_BASE}/graph/search`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: { query: 'v_trade_id', node_types: ['XsltVariable'] },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeDefined()
  })
})

test.describe('GET /graph/node/:node_id', () => {
  test('returns 200 or 404 for a node id', async ({ request }) => {
    const res = await request.get(`${API_BASE}/graph/node/v_trade_id`, { headers: AUTH_HEADER })
    expect([200, 404]).toContain(res.status())
  })
})

test.describe('POST /graph/path', () => {
  test('finds path between two nodes', async ({ request }) => {
    const res = await request.post(`${API_BASE}/graph/path`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: { from_node: 'TRADE_ID', to_node: 'v_trade_id' },
    })
    expect(res.status()).toBe(200)
  })
})
