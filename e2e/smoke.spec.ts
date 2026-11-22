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

  // Notes open in the docked side panel, ready to type.
  await page.getByRole('button', { name: '笔记', exact: true }).click()
  const notes = page.getByRole('complementary', { name: '笔记与 AI 助手' })
  await notes.getByRole('textbox', { name: '题目笔记' }).fill('闭包会捕获外部变量')
  await expect(notes.getByText('已保存')).toBeVisible({ timeout: 5_000 })

  await page.reload()
  await page.getByRole('button', { name: '笔记', exact: true }).click()
  await expect(
    page.getByRole('complementary', { name: '笔记与 AI 助手' }).getByText('闭包会捕获外部变量'),
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

test('a weak point can be marked mastered and the change undone', async ({ page }) => {
  await page.goto('/questions')
  const first = page.locator('a[href^="/questions/"]').first()
  await expect(first).toBeVisible({ timeout: 20_000 })
  await first.click()

  const reveal = page.getByRole('button', { name: /查看参考答案/ })
  const notYet = page.getByRole('button', { name: /没掌握/ })
  await expect(reveal.or(notYet).first()).toBeVisible({ timeout: 20_000 })
  if (await reveal.isVisible()) await reveal.click()
  await notYet.click()

  await page.goto('/weak')
  const row = page.getByRole('button', { name: /标为已掌握$/ })
  await expect(row).toHaveCount(1, { timeout: 20_000 })
  await row.click()
  await expect(page.getByText('暂无待复习题目')).toBeVisible()

  await page.getByRole('button', { name: '撤销' }).click()
  await expect(page.getByRole('button', { name: /标为已掌握$/ })).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('button', { name: /标为已掌握$/ })).toHaveCount(1, {
    timeout: 20_000,
  })
})

test('pasted Markdown questions are imported into the bank', async ({ page }) => {
  await page.goto('/import')
  await page.getByRole('radio', { name: /粘贴内容/ }).click()
  await page.getByLabel('来源名称').fill('e2e整理')
  await page
    .getByLabel('题目内容')
    .fill('## Q: e2e 独有的闭包题\n**模块**: js\n**难度**: 中级\n\n闭包是函数和词法环境的组合。')
  await expect(page.getByText('识别到 1 道题')).toBeVisible()
  await page.getByRole('button', { name: '导入', exact: true }).click()
  await expect(page.getByText('成功导入 1 道题')).toBeVisible({ timeout: 10_000 })

  await page.goto('/')
  await expect(page.getByText(/共 \d+ 道题/)).toBeVisible({ timeout: 20_000 })
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: '搜索题目或命令' }).fill('e2e 独有')
  await expect(page.getByRole('option', { name: /e2e 独有的闭包题/ })).toBeVisible()
})

test('first visit shows the onboarding guide once', async ({ page }) => {
  // Undo skipOnboarding for the first load only, so the reload checks persistence.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e_onboarding_seen')) return
    sessionStorage.setItem('e2e_onboarding_seen', '1')
    localStorage.removeItem('iface_onboarding_done_v1')
  })
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: '欢迎来到 iFace！' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '下一步' }).click()
  await expect(page.getByRole('dialog', { name: '题库设置' })).toBeVisible()
  const golang = page.getByRole('switch', { name: /Golang/ })
  await golang.click()
  await expect(golang).not.toBeChecked()
  await page.getByRole('button', { name: '全部显示' }).click()
  await expect(golang).toBeChecked()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '完成引导' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText(/共 \d+ 道题/)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('the sidebar collapses to an icon rail and remembers it', async ({ page }) => {
  await page.goto('/')
  const sidebar = page.getByRole('complementary', { name: '侧栏' })
  await expect(sidebar).toBeVisible({ timeout: 20_000 })

  await sidebar.getByRole('button', { name: '收起侧栏' }).click()
  await expect(sidebar.getByRole('button', { name: '展开侧栏' })).toBeVisible()
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBeLessThan(80)

  await page.reload()
  await expect(sidebar.getByRole('button', { name: '展开侧栏' })).toBeVisible({ timeout: 20_000 })
  await page.keyboard.press('[')
  await expect(sidebar.getByRole('button', { name: '收起侧栏' })).toBeVisible()
})

test('the module question list docks beside the page and stays open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/questions/code-001')
  await page.getByRole('button', { name: /展开.*题目列表/ }).click({ timeout: 20_000 })
  const list = page.getByRole('complementary', { name: '本模块题目' })
  await expect(list).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await list.locator('button[data-module-item]').nth(1).click()
  await expect(page).toHaveURL(/\/questions\/code-002/)
  await expect(list).toBeVisible()

  await page.reload()
  await expect(list).toBeVisible({ timeout: 20_000 })
  await list.getByRole('button', { name: '收起题目列表' }).click()
  await expect(list).toHaveCount(0)
})

test('form drafts survive leaving the page', async ({ page }) => {
  await page.goto('/tools/jd-match')
  await page.getByLabel('岗位 JD').fill('e2e 草稿 JD')
  await page.goto('/')
  await page.goto('/tools/jd-match')
  await expect(page.getByLabel('岗位 JD')).toHaveValue('e2e 草稿 JD', { timeout: 20_000 })
})

test('going back to the question list restores the scroll position', async ({ page }) => {
  await page.goto('/questions')
  const rows = page.locator('a[href^="/questions/"]')
  await expect(rows.first()).toBeVisible({ timeout: 20_000 })
  const target = rows.nth(20)
  await target.scrollIntoViewIfNeeded()
  const before = await page.evaluate<number>('window.scrollY')
  expect(before).toBeGreaterThan(200)
  await target.click()
  await expect(page).toHaveURL(/\/questions\/[^/]+$/)
  await page.goBack()
  await expect.poll(() => page.evaluate<number>('window.scrollY')).toBeGreaterThan(before - 10)
})
