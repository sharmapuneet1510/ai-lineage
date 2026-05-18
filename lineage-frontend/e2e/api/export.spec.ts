// e2e/api/export.spec.ts
import { test, expect } from '@playwright/test'
import { API_BASE, FIELDS, AUTH_HEADER } from '../fixtures/seed-data'

test.describe('POST /export/fields', () => {
  test('exports fields as CSV', async ({ request }) => {
    const res = await request.post(`${API_BASE}/export/fields?format=csv`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: { jurisdiction: 'JFSA' },
    })
    expect(res.status()).toBe(200)
  })
})

test.describe('POST /export/comparison', () => {
  test('exports comparison as excel', async ({ request }) => {
    const res = await request.post(`${API_BASE}/export/comparison?format=excel`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: { field_ids: [FIELDS.TRADE_ID.field_id, FIELDS.TRADE_TIMESTAMP.field_id] },
    })
    expect(res.status()).toBe(200)
  })
})

test.describe('POST /export/impact-analysis', () => {
  test('exports impact analysis as CSV', async ({ request }) => {
    const res = await request.post(`${API_BASE}/export/impact-analysis?format=csv`, {
      headers: { ...AUTH_HEADER, 'Content-Type': 'application/json' },
      data: { field_id: FIELDS.TRADE_ID.field_id },
    })
    expect(res.status()).toBe(200)
  })
})
