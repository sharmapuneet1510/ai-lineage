import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175/settings')
  })

  test('renders settings page without errors', async ({ page }) => {
    const title = page.locator('h1').first()
    await expect(title).toContainText('Settings')

    const description = page.locator('p').first()
    await expect(description).toContainText('Manage your account settings and preferences')

    const sidebar = page.locator('.section-card').first()
    await expect(sidebar).toBeVisible()

    const tabs = ['Profile', 'Preferences', 'Notifications', 'Security']
    for (const tab of tabs) {
      const tabBtn = page.locator('button').filter({ hasText: new RegExp(`^${tab}$`, 'i') })
      await expect(tabBtn).toBeVisible()
    }
  })

  test('Profile tab - displays user information', async ({ page }) => {
    const sidebar = page.locator('.section-card').first()
    const profileTab = sidebar.locator('button').filter({ hasText: /Profile/i })
    await profileTab.click()

    const contentArea = page.locator('.section-card').nth(1)

    const avatar = contentArea.locator('text=PS')
    await expect(avatar).toBeVisible()

    await expect(contentArea.locator('text=puneet.sharma').first()).toBeVisible()
    await expect(contentArea.locator('text=puneet.sharma@example.com')).toBeVisible()
    await expect(contentArea.locator('text=LINEAGE_ADMIN')).toBeVisible()

    await expect(contentArea.locator('text=Member Since')).toBeVisible()
    await expect(contentArea.locator('text=Last Login')).toBeVisible()

    const editBtn = contentArea.locator('button').filter({ hasText: /Edit Profile/i })
    const signOutBtn = contentArea.locator('button').filter({ hasText: /Sign Out/i })
    await expect(editBtn).toBeVisible()
    await expect(signOutBtn).toBeVisible()
  })

  test('Preferences tab - theme selector', async ({ page }) => {
    const sidebar = page.locator('.section-card').first()
    const prefTab = sidebar.locator('button').filter({ hasText: /Preferences/i })
    await prefTab.click()

    await expect(page.locator('label').filter({ hasText: /Theme/i })).toBeVisible()

    const themeSelect = page.locator('select').first()
    await expect(themeSelect).toBeVisible()

    const options = themeSelect.locator('option')
    await expect(options).toHaveCount(3)
    await expect(options.nth(0)).toContainText('Light')
    await expect(options.nth(1)).toContainText('Dark')
    await expect(options.nth(2)).toContainText('Auto')
  })

  test('Preferences tab - language selector', async ({ page }) => {
    const sidebar = page.locator('.section-card').first()
    const prefTab = sidebar.locator('button').filter({ hasText: /Preferences/i })
    await prefTab.click()

    await expect(page.locator('label').filter({ hasText: /Language/i })).toBeVisible()

    const langSelect = page.locator('select').last()
    await expect(langSelect).toBeVisible()

    const options = langSelect.locator('option')
    await expect(options).toHaveCount(4)
  })

  test('Preferences tab - save preferences', async ({ page }) => {
    const sidebar = page.locator('.section-card').first()
    const prefTab = sidebar.locator('button').filter({ hasText: /Preferences/i })
    await prefTab.click()

    const themeSelect = page.locator('select').first()
    await themeSelect.selectOption('auto')

    const saveBtn = page.locator('button').filter({ hasText: /Save Preferences/i }).first()
    await saveBtn.click()

    await expect(page.locator('text=Saved successfully')).toBeVisible({ timeout: 5000 })
  })

  test('Notifications tab - toggle switches', async ({ page }) => {
    const notifTab = page.locator('button').filter({ hasText: /^Notifications$/i }).first()
    await notifTab.click()

    await expect(page.locator('text=In-App Notifications')).toBeVisible()
    const inAppToggle = page.locator('input[type="checkbox"]').first()
    await expect(inAppToggle).toBeVisible()

    await expect(page.locator('text=Email Notifications')).toBeVisible()
    const emailToggle = page.locator('input[type="checkbox"]').last()
    await expect(emailToggle).toBeVisible()

    await expect(page.locator('text=Get notified about important changes')).toBeVisible()
    await expect(page.locator('text=Receive email updates')).toBeVisible()
  })

  test('Notifications tab - toggle in-app notifications', async ({ page }) => {
    const notifTab = page.locator('button').filter({ hasText: /^Notifications$/i }).first()
    await notifTab.click()

    const inAppToggle = page.locator('input[type="checkbox"]').first()
    const wasChecked = await inAppToggle.isChecked()
    await inAppToggle.click()

    const newState = await inAppToggle.isChecked()
    expect(newState).not.toBe(wasChecked)
  })

  test('Notifications tab - save preferences', async ({ page }) => {
    const sidebar = page.locator('.section-card').first()
    const notifTab = sidebar.locator('button').filter({ hasText: /Notifications/i })
    await notifTab.click()

    const contentArea = page.locator('.section-card').nth(1)
    const emailToggle = contentArea.locator('input[type="checkbox"]').last()
    const wasChecked = await emailToggle.isChecked()
    await emailToggle.click()

    const newState = await emailToggle.isChecked()
    expect(newState).not.toBe(wasChecked)

    const saveBtn = contentArea.locator('button').filter({ hasText: /Save Preferences/i })
    await expect(saveBtn).toBeEnabled()
  })

  test('Security tab - change password button', async ({ page }) => {
    const sidebar = page.locator('.section-card').first()
    const secTab = sidebar.locator('button').filter({ hasText: /Security/i })
    await secTab.click()

    const contentArea = page.locator('.section-card').nth(1)
    await expect(contentArea.locator('text=Password').first()).toBeVisible()
    await expect(contentArea.locator('text=Update your password regularly for security').first()).toBeVisible()

    const changePwdBtn = contentArea.locator('button').filter({ hasText: /Change Password/i })
    await expect(changePwdBtn).toBeVisible()
  })

  test('Security tab - active sessions', async ({ page }) => {
    const secTab = page.locator('button').filter({ hasText: /^Security$/i }).first()
    await secTab.click()

    await expect(page.locator('text=Active Sessions')).toBeVisible()

    await expect(page.locator('text=Current Session')).toBeVisible()
    await expect(page.locator('text=Chrome on macOS')).toBeVisible()
    await expect(page.locator('text=Last active: now')).toBeVisible()

    const signOutBtn = page.locator('button').filter({ hasText: /Sign Out All Other Sessions/i })
    await expect(signOutBtn).toBeVisible()
    await expect(signOutBtn).toHaveCount(1)
  })

  test('Security tab - delete account section', async ({ page }) => {
    const secTab = page.locator('button').filter({ hasText: /^Security$/i }).first()
    await secTab.click()

    await expect(page.locator('text=Danger Zone')).toBeVisible()

    const deleteBtn = page.locator('button').filter({ hasText: /Delete Account/i })
    await expect(deleteBtn).toBeVisible()

    await expect(deleteBtn).toHaveAttribute('style', /background:/)
  })

  test('Security tab - delete account modal opens', async ({ page }) => {
    const secTab = page.locator('button').filter({ hasText: /^Security$/i }).first()
    await secTab.click()

    const deleteBtn = page.locator('button').filter({ hasText: /Delete Account/i })
    await deleteBtn.click()

    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()

    await expect(page.locator('h2')).toContainText('Delete Account?')

    await expect(page.locator('text=Are you sure you want to delete your account?')).toBeVisible()

    await expect(page.locator('text=All your data will be permanently deleted')).toBeVisible()
    await expect(page.locator('text=You will lose access to all lineage data')).toBeVisible()
    await expect(page.locator('text=This cannot be reversed')).toBeVisible()
  })

  test('Security tab - delete account modal cancel', async ({ page }) => {
    const secTab = page.locator('button').filter({ hasText: /^Security$/i }).first()
    await secTab.click()

    const deleteBtn = page.locator('button').filter({ hasText: /Delete Account/i })
    await deleteBtn.click()

    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()

    const cancelBtn = page.locator('button').filter({ hasText: /Cancel/i }).last()
    await cancelBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('Security tab - delete account modal close button', async ({ page }) => {
    const secTab = page.locator('button').filter({ hasText: /^Security$/i }).first()
    await secTab.click()

    const deleteBtn = page.locator('button').filter({ hasText: /Delete Account/i })
    await deleteBtn.click()

    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()

    const closeBtn = page.locator('.close-btn')
    await closeBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('Tab navigation - switches between all tabs', async ({ page }) => {
    const tabs = ['Profile', 'Preferences', 'Notifications', 'Security']

    for (const tabName of tabs) {
      const tab = page.locator('button').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }).first()
      await tab.click()

      if (tabName === 'Profile') {
        const profileSection = page.locator('.section-card-header').filter({ hasText: /User Profile/i })
        await expect(profileSection).toBeVisible()
      } else if (tabName === 'Preferences') {
        const prefSection = page.locator('.section-card-header').filter({ hasText: /Appearance & Language/i })
        await expect(prefSection).toBeVisible()
      } else if (tabName === 'Notifications') {
        const notifSection = page.locator('.section-card-header').filter({ hasText: /Notification Settings/i })
        await expect(notifSection).toBeVisible()
      } else if (tabName === 'Security') {
        const secSection = page.locator('.section-card-header').filter({ hasText: /Security & Account/i })
        await expect(secSection).toBeVisible()
      }
    }
  })

  test('Page layout - sidebar and content area display', async ({ page }) => {
    const sidebarNav = page.locator('.section-card').first()
    await expect(sidebarNav).toBeVisible()

    const contentArea = page.locator('.section-card').nth(1)
    await expect(contentArea).toBeVisible()

    const sidebarBox = await sidebarNav.boundingBox()
    const contentBox = await contentArea.boundingBox()
    if (sidebarBox && contentBox) {
      expect(sidebarBox.width).toBeLessThan(contentBox.width)
    }
  })

  test('Badge display - role badge on profile', async ({ page }) => {
    const profileTab = page.locator('button').filter({ hasText: /^Profile$/i }).first()
    await profileTab.click()

    const roleBadge = page.locator('.badge-blue').filter({ hasText: /LINEAGE_ADMIN/i })
    await expect(roleBadge).toBeVisible()
  })

  test('Responsive - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    const title = page.locator('h1').first()
    await expect(title).toBeVisible()

    const profileTab = page.locator('button').filter({ hasText: /^Profile$/i }).first()
    await expect(profileTab).toBeVisible()
  })

  test('Modal - overlay click closes modal', async ({ page }) => {
    const secTab = page.locator('button').filter({ hasText: /^Security$/i }).first()
    await secTab.click()

    const deleteBtn = page.locator('button').filter({ hasText: /Delete Account/i })
    await deleteBtn.click()

    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()

    const overlay = page.locator('.modal-overlay')
    const overlayBox = await overlay.boundingBox()
    if (overlayBox) {
      await page.click('.modal-overlay', { position: { x: 10, y: 10 } })
    }

    await expect(modal).not.toBeVisible()
  })
})
