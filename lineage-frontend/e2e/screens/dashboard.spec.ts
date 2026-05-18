// e2e/screens/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Dashboard Screen (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page title shows "Lineage"', async ({ page }) => {
    await expect(page).toHaveTitle(/Lineage/)
  })

  test('navigation links are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /fields/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /comparison/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /impact/i })).toBeVisible()
  })

  test('dashboard stats cards load', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    // Dashboard renders stats: total fields, jurisdictions, etc.
    const body = page.locator('body')
    await expect(body).not.toContainText('Error')
  })

  test('navigation to Fields works', async ({ page }) => {
    await page.getByRole('link', { name: /fields/i }).first().click()
    await expect(page).toHaveURL(/\/fields/)
  })
})
