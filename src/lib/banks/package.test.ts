import { describe, expect, it } from 'vitest'
import { resolveBank } from '@/data/bank/validate'
import { emptyLocalBank, mergeIntoBank } from './localImport'
import { restoreSnapshot, snapshotBank, storedToResolved } from './package'
import { bankRecords } from './records'

const checks = [
  {
    id: 'c1',
    kind: 'single' as const,
    prompt: '选一个',
    options: [
      { id: 'a', text: '对' },
      { id: 'b', text: '错' },
    ],
    answerIds: ['a'],
    explanation: '因为对。',
  },
]

function sampleRecords() {
  const merged = mergeIntoBank(emptyLocalBank('我的题库'), [
    { module: 'React', difficulty: 1, question: 'Q1', answer: 'A1', tags: ['x'] },
    { module: '网络', difficulty: 3, question: 'Q2', answer: 'A2', checks },
  ])
  return bankRecords('local.mine-ab12', merged.bank, {
    origin: { kind: 'local' },
    order: 7,
    enabled: false,
    now: 1000,
  })
}

describe('bank packages', () => {
  it('rebuilds the package from stored rows', () => {
    const { bank, questions, checks: stored } = sampleRecords()
    const resolved = storedToResolved(bank, questions, stored)
    expect(resolved.modules.map((mod) => mod.name)).toEqual(['React', '网络'])
    expect(resolved.modules[1].questions[0].checks).toEqual(checks)
    expect(resolved.questionCount).toBe(2)
  })

  it('snapshots validate as iface-bank@1 and restore to the same rows', async () => {
    const records = sampleRecords()
    const snapshot = snapshotBank(records.bank, records.questions, records.checks)
    const validation = await resolveBank(JSON.stringify(snapshot.package))
    expect(validation.issues.filter((issue) => issue.level === 'error')).toEqual([])

    const restored = await restoreSnapshot(snapshot)
    if (!restored.records) throw new Error(restored.error)
    expect(restored.records.questions).toEqual(records.questions)
    expect(restored.records.checks).toEqual(records.checks)
    expect(restored.records.bank).toMatchObject({ enabled: false, order: 7, updatedAt: 1000 })
  })

  it('reports a broken snapshot instead of storing it', async () => {
    const records = sampleRecords()
    const snapshot = snapshotBank(records.bank, records.questions, records.checks)
    snapshot.package.modules[0].questions[0].difficulty = 9 as 1
    const restored = await restoreSnapshot(snapshot)
    expect(restored.records).toBeNull()
  })
})
