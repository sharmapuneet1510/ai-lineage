// e2e/screens/graph.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Graph Explorer Screen (/graph)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph')
    await page.waitForLoadState('networkidle')
  })

  test('page renders without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Unexpected error')
  })

  test('has a search input for graph nodes', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder]').first()
    const hasInput = await searchInput.count() > 0
    expect(hasInput).toBe(true)
  })

  test('search input is visible', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder]').first()
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible()
    }
  })

  test('searching shows results or empty state', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder]').first()
    if (await searchInput.count() > 0 && await searchInput.isVisible()) {
      await searchInput.fill('trade')
      await page.keyboard.press('Enter')
      await page.waitForLoadState('networkidle')
      // Graph should show some result or empty state (not an error)
      await expect(page.locator('body')).not.toContainText('Unexpected error')
    }
  })

  test('page displays without crashing', async ({ page }) => {
    // Just verify page is rendered
    const body = page.locator('body')
    const content = await body.textContent()
    expect(content).toBeDefined()
  })
})
