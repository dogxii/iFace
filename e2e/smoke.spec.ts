import { expect, type Page, test } from '@playwright/test'

async function skipOnboarding(page: Page) {
  await page.addInitScript(() => localStorage.setItem('iface_onboarding_done_v1', '1'))
}

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page)
})

test('dashboard loads the bundled question bank', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/共 \d+ 道题/)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/共 0 道题/)).toHaveCount(0)
})

test('question list opens a question detail page', async ({ page }) => {
  await page.goto('/questions')
  const first = page.locator('a[href^="/questions/"]').first()
  await expect(first).toBeVisible({ timeout: 20_000 })
  await first.click()
  await expect(page).toHaveURL(/\/questions\/[^/]+/)
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('marking a question as mastered persists after reload', async ({ page }) => {
  await page.goto('/questions')
  const first = page.locator('a[href^="/questions/"]').first()
  await expect(first).toBeVisible({ timeout: 20_000 })
  await first.click()

  const mastered = page.getByRole('button', { name: /完全掌握/ })
  if (!(await mastered.isVisible())) {
    await page.keyboard.press('Space')
  }
  await mastered.click()

  await page.goto('/')
  await expect(page.getByText(/已掌握 1 道/)).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(page.getByText(/已掌握 1 道/)).toBeVisible({ timeout: 20_000 })
})
