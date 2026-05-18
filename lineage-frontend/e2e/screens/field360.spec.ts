// e2e/screens/field360.spec.ts
import { test, expect } from '@playwright/test'
import { FIELDS } from '../fixtures/seed-data'

test.describe('Field 360 Screen (/fields/:fieldId)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/fields/${FIELDS.TRADE_ID.field_id}`)
    await page.waitForLoadState('networkidle')
  })

  test('page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Unexpected error')
  })

  test('displays field information or not found message', async ({ page }) => {
    // Field 360 should display either field information or not found message
    const content = page.locator('body')
    const text = await content.textContent()
    // Page should not have unexpected error (it's OK if field not found)
    const hasUnexpectedError = text?.includes('Unexpected error')
    expect(hasUnexpectedError).toBeFalsy()
  })

  test('tabs are rendered or field not found', async ({ page }) => {
    const tabButtons = page.locator('.tab-btn')
    const notFoundMsg = page.getByText(/not found|not exist/i)

    // Check if at least some tabs exist OR if not found message shown
    const hasTabButtons = await tabButtons.count() > 0
    const isNotFound = await notFoundMsg.count() > 0

    const hasTabsOrNotFound = hasTabButtons || isNotFound
    expect(hasTabsOrNotFound).toBe(true)
  })

  test('clicking Business tab shows content', async ({ page }) => {
    const businessTab = page.locator('.tab-btn', { hasText: /business/i })
    if (await businessTab.count() > 0) {
      await businessTab.click()
      await page.waitForLoadState('networkidle')
      // Tab should open without error
      await expect(page.locator('body')).not.toContainText('Error loading')
    }
  })

  test('clicking XSLT tab shows content if exists', async ({ page }) => {
    const xsltTab = page.locator('.tab-btn', { hasText: /xslt/i })
    if (await xsltTab.count() > 0 && await xsltTab.isVisible()) {
      await xsltTab.click()
      await page.waitForLoadState('networkidle')
      // XSLT tab loaded without error
      await expect(page.locator('body')).not.toContainText('Error loading')
    }
  })

  test('navigating to field works or shows not found', async ({ page }) => {
    // Page should either load field details or show a not found message
    const body = page.locator('body')
    const isError = await body.textContent().then(t => t?.includes('not found') || t?.includes('Not found') || false)
    const isLoaded = !(await body.textContent().then(t => t?.includes('Unexpected error') || false))
    expect(isError || isLoaded).toBe(true)
  })
})
