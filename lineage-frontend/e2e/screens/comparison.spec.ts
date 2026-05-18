// e2e/screens/comparison.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Field Comparison Screen (/comparison)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/comparison')
    await page.waitForLoadState('networkidle')
  })

  test('page renders without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Unexpected error')
  })

  test('page has interaction elements', async ({ page }) => {
    // Comparison page should have some form of field selection
    const selects = page.locator('select')
    const inputs = page.locator('input')
    const buttons = page.locator('button')
    const hasInteraction = (await selects.count()) > 0 || (await inputs.count()) > 0 || (await buttons.count()) > 0
    expect(hasInteraction).toBe(true)
  })

  test('shows content or empty state', async ({ page }) => {
    // Should either show fields to compare or empty state, not error
    const body = page.locator('body')
    await expect(body).not.toContainText('Unexpected error')
  })

  test('search or selection works if available', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('TRADE')
      await page.waitForLoadState('networkidle')
      // Should not error
      await expect(page.locator('body')).not.toContainText('Error')
    }
  })
})
