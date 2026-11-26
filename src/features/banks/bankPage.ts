import type { BankIssue, ResolvedBank } from '@/data/bank/validate'
import type { BankDiff } from '@/lib/banks/diff'
import type { InstalledBank } from '@/types'

export const ORIGIN_LABEL: Record<InstalledBank['origin']['kind'], string> = {
  bundled: '官方',
  github: 'GitHub',
  url: '链接',
  local: '本地',
}

/** Where a bank can be viewed on the web, if anywhere. */
export function bankHomepage(bank: Pick<InstalledBank, 'origin' | 'homepage'>): string | null {
  const { origin } = bank
  if (origin.kind === 'github') {
    const base = `https://github.com/${origin.owner}/${origin.repo}`
    return origin.path ? `${base}/tree/${origin.sha}/${origin.path}` : base
  }
  if (origin.kind === 'url') return origin.url
  return bank.homepage ?? null
}

export function diffSummary(diff: BankDiff): string {
  const parts = [
    diff.added.length > 0 ? `新增 ${diff.added.length} 题` : '',
    diff.changed.length > 0 ? `修改 ${diff.changed.length} 题` : '',
    diff.removed.length > 0 ? `移除 ${diff.removed.length} 题` : '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '题目内容没有变化'
}

/** The first `count` questions, spread over the first modules, for a preview. */
export function sampleQuestions(
  bank: ResolvedBank,
  count = 3,
): { module: string; question: string; difficulty: number }[] {
  const picked: { module: string; question: string; difficulty: number }[] = []
  for (let round = 0; picked.length < count; round++) {
    let any = false
    for (const mod of bank.modules) {
      const question = mod.questions[round]
      if (!question) continue
      any = true
      picked.push({
        module: mod.name,
        question: question.question,
        difficulty: question.difficulty,
      })
      if (picked.length === count) break
    }
    if (!any) break
  }
  return picked
}

export function issueText(issue: BankIssue): string {
  const where = [issue.file, issue.line ? `第 ${issue.line} 行` : issue.path]
    .filter(Boolean)
    .join(' ')
  return where ? `${where}：${issue.message}` : issue.message
}
