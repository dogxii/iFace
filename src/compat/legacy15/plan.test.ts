// COMPAT: remove after 2027-06-30
import { describe, expect, it } from 'vitest'
import {
  type LegacyQuestion,
  newerByField,
  planLegacyMigration,
  remapByQuestionId,
  remapIdList,
  remapQuestionRefs,
} from './plan'

const q = (id: string, extra: Partial<LegacyQuestion> = {}): LegacyQuestion => ({
  id,
  module: 'JS基础',
  difficulty: 1,
  question: `Q ${id}`,
  answer: `A ${id}`,
  tags: ['t'],
  ...extra,
})

const officialKeys = new Map([
  ['js-001', 'iface.frontend:js-001'],
  ['go-basics-001', 'iface.golang:go-basics-001'],
])

describe('planLegacyMigration', () => {
  it('maps official ids and leaves unknown and already-migrated ids alone', () => {
    const plan = planLegacyMigration({
      questions: [q('js-001'), q('go-basics-001'), q('removed-001'), q('iface.java:x')],
      officialKeys,
    })
    expect([...plan.idMap]).toEqual([
      ['js-001', 'iface.frontend:js-001'],
      ['go-basics-001', 'iface.golang:go-basics-001'],
    ])
    expect(plan.localBanks).toEqual([])
  })

  it('turns every import source into a local bank with valid ids', () => {
    const plan = planLegacyMigration({
      questions: [
        q('custom_my-go.json_basics-001', { source: 'my-go.json', module: 'Go基础' }),
        q('custom_my-go.json_Weird ID!!', { source: 'my-go.json', module: 'Go基础' }),
        q('custom_my-go.json_weird-id', { source: 'my-go.json', module: '并发' }),
        q('custom_面经_js-001', { source: '面经', module: 'JS基础' }),
      ],
      officialKeys,
      suffixFor: () => 'abcd',
    })

    expect(plan.localBanks.map((b) => [b.id, b.bank.name, b.bank.questionCount])).toEqual([
      ['local.my-go-abcd', 'My Go', 3],
      ['local.imported-abcd', '面经', 1],
    ])
    const [goBank] = plan.localBanks
    expect(goBank.bank.modules.map((m) => [m.id, m.name])).toEqual([
      ['go', 'Go基础'],
      ['m2', '并发'],
    ])
    expect(goBank.bank.modules.flatMap((m) => m.questions.map((x) => x.id))).toEqual([
      'basics-001',
      'weird-id',
      'weird-id-2',
    ])
    expect(plan.idMap.get('custom_my-go.json_Weird ID!!')).toBe('local.my-go-abcd:weird-id')
    expect(plan.idMap.get('custom_面经_js-001')).toBe('local.imported-abcd:js-001')
  })

  it('disables banks whose old category was hidden', () => {
    const plan = planLegacyMigration({
      questions: [q('custom_notes.md_a', { source: 'notes.md' })],
      officialKeys,
      hiddenCategories: ['Golang', 'Notes', 'Unknown'],
      suffixFor: () => 'zzzz',
    })
    expect(plan.disabledBankIds).toEqual(['iface.golang', 'local.notes-zzzz'])
  })

  it('derives the same local bank id on every run', () => {
    const questions = [q('custom_a.json_x', { source: 'a.json' })]
    const first = planLegacyMigration({ questions, officialKeys }).localBanks[0].id
    expect(planLegacyMigration({ questions, officialKeys }).localBanks[0].id).toBe(first)
    expect(first).toMatch(/^local\.a-[0-9a-z]{4}$/)
  })
})

describe('remapping', () => {
  const idMap = new Map([
    ['js-001', 'iface.frontend:js-001'],
    ['js-002', 'iface.frontend:js-002'],
  ])

  it('renames records and keeps the newer one on a collision', () => {
    const records = [
      { questionId: 'js-001', lastUpdated: 1 },
      { questionId: 'iface.frontend:js-001', lastUpdated: 5 },
      { questionId: 'js-002', lastUpdated: 3 },
      { questionId: 'gone', lastUpdated: 2 },
    ]
    expect(remapByQuestionId(records, idMap, newerByField('lastUpdated'))).toEqual([
      { questionId: 'iface.frontend:js-001', lastUpdated: 5 },
      { questionId: 'iface.frontend:js-002', lastUpdated: 3 },
      { questionId: 'gone', lastUpdated: 2 },
    ])
  })

  it('moves references and id lists', () => {
    expect(remapQuestionRefs([{ id: 'a', questionId: 'js-002' }], idMap)).toEqual([
      { id: 'a', questionId: 'iface.frontend:js-002' },
    ])
    expect(remapIdList(['js-001', 'x'], idMap)).toEqual(['iface.frontend:js-001', 'x'])
  })
})
