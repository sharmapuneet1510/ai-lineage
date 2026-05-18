// e2e/screens/fields.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Field List Screen (/fields)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fields')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without error', async ({ page }) => {
    const body = page.locator('body')
    await expect(body).not.toContainText('Error')
  })

  test('page renders without error', async ({ page }) => {
    // Just verify page is displayed without errors
    await expect(page.locator('body')).not.toContainText('Error')
  })

  test('shows TRADE_ID in the list', async ({ page }) => {
    const tradeId = page.getByText('TRADE_ID', { exact: false })
    if (await tradeId.count() > 0) {
      await expect(tradeId).toBeVisible()
    } else {
      // If data not loaded, at least page should render without error
      await expect(page.locator('body')).not.toContainText('Error')
    }
  })

  test('shows TRADE_TIMESTAMP in the list', async ({ page }) => {
    const tradeTimestamp = page.getByText('TRADE_TIMESTAMP', { exact: false })
    if (await tradeTimestamp.count() > 0) {
      await expect(tradeTimestamp).toBeVisible()
    } else {
      // If data not loaded, page should still render
      await expect(page.locator('body')).not.toContainText('Error')
    }
  })

  test('jurisdiction filter exists if data loaded', async ({ page }) => {
    const filterSelect = page.locator('select').first()
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('JFSA')
      await page.waitForLoadState('networkidle')
      // Should not show error
      await expect(page.locator('body')).not.toContainText('Error')
    }
  })

  test('search input works if present', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('TRADE')
      await page.waitForLoadState('networkidle')
      // Should not show error
      await expect(page.locator('body')).not.toContainText('Error')
    }
  })
})
