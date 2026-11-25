import { describe, expect, it } from 'vitest'
import type { Question, StudyRecordMap } from '@/types'
import { groupByBank } from './libraryGroups'

const q = (id: string, bankId: string, mod: string): Question => ({
  id: `${bankId}:${id}`,
  bankId,
  moduleKey: `${bankId}/${mod}`,
  module: mod.toUpperCase(),
  difficulty: 1,
  question: id,
  answer: '',
  tags: [],
  position: 0,
})

describe('groupByBank', () => {
  it('groups modules under their bank in question order and counts mastery', () => {
    const questions = [
      q('a', 'iface.go', 'basics'),
      q('b', 'local.x', 'misc'),
      q('c', 'iface.go', 'basics'),
    ]
    const records: StudyRecordMap = {
      'iface.go:c': {
        questionId: 'iface.go:c',
        status: 'mastered',
        lastUpdated: 0,
        reviewCount: 0,
      },
    }
    const groups = groupByBank(questions, [{ id: 'iface.go', name: 'Golang' }], records)
    expect(groups).toEqual([
      {
        bankId: 'iface.go',
        name: 'Golang',
        modules: [{ moduleKey: 'iface.go/basics', module: 'BASICS', total: 2, mastered: 1 }],
      },
      {
        bankId: 'local.x',
        name: 'local.x',
        modules: [{ moduleKey: 'local.x/misc', module: 'MISC', total: 1, mastered: 0 }],
      },
    ])
  })
})
