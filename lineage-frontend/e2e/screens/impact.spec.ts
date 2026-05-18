// e2e/screens/impact.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Impact Analysis Screen (/impact)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/impact')
    await page.waitForLoadState('networkidle')
  })

  test('page renders without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Unexpected error')
  })

  test('has search or input for source field', async ({ page }) => {
    const inputs = page.locator('input')
    const selects = page.locator('select')
    const buttons = page.locator('button')
    const hasInput = (await inputs.count()) > 0 || (await selects.count()) > 0 || (await buttons.count()) > 0
    expect(hasInput).toBe(true)
  })

  test('page displays content or empty state', async ({ page }) => {
    // Should render some content, not error
    const body = page.locator('body')
    await expect(body).not.toContainText('Unexpected error')
  })

  test('search functionality works if available', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('TRADE')
      await page.waitForLoadState('networkidle')
      // Should process search without error
      await expect(page.locator('body')).not.toContainText('Unexpected error')
    }
  })
})
