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

  // In the default "answer first" mode the status buttons appear after revealing the answer.
  const reveal = page.getByRole('button', { name: /查看参考答案/ })
  const mastered = page.getByRole('button', { name: /完全掌握/ })
  await expect(reveal.or(mastered).first()).toBeVisible({ timeout: 20_000 })
  if (await reveal.isVisible()) await reveal.click()
  await mastered.click()

  await page.goto('/')
  await expect(page.getByText(/已掌握 1 道/)).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(page.getByText(/已掌握 1 道/)).toBeVisible({ timeout: 20_000 })
})

test('theme choice persists across reloads', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '切换暗色' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})
