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

test('a question note is saved and survives a reload', async ({ page }) => {
  await page.goto('/questions')
  const first = page.locator('a[href^="/questions/"]').first()
  await expect(first).toBeVisible({ timeout: 20_000 })
  await first.click()

  await page.getByRole('button', { name: /笔记/ }).first().click()
  const notes = page.getByRole('dialog', { name: '题目笔记' })
  await notes.getByRole('button', { name: '开始记录' }).click()
  await notes.getByRole('textbox', { name: '题目笔记' }).fill('闭包会捕获外部变量')
  await expect(notes.getByText('已保存')).toBeVisible({ timeout: 5_000 })

  await page.reload()
  await page.getByRole('button', { name: /笔记/ }).first().click()
  await expect(
    page.getByRole('dialog', { name: '题目笔记' }).getByText('闭包会捕获外部变量'),
  ).toBeVisible({ timeout: 10_000 })
})

test('settings exports a JSON backup of the question bank', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/共 \d+ 道题/)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: '设置' }).first().click()
  await page
    .getByRole('navigation', { name: '设置分类' })
    .getByRole('button', { name: '数据管理' })
    .click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^iface-backup-\d{4}-\d{2}-\d{2}\.json$/)

  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const backup = JSON.parse(await readFile(path, 'utf8'))
  expect(Array.isArray(backup.questions)).toBe(true)
  expect(backup.questions.length).toBeGreaterThan(0)
  expect(JSON.stringify(backup)).not.toContain('apiKey')
})

test('the command palette finds and opens a question', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/共 \d+ 道题/)).toBeVisible({ timeout: 20_000 })
  await page.keyboard.press('Control+k')
  const input = page.getByRole('combobox', { name: '搜索题目或命令' })
  await expect(input).toBeFocused()
  await input.fill('闭包')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/questions\/[^/]+$/)
})
