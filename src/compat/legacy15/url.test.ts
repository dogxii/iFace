// COMPAT: remove after 2027-06-30
import { describe, expect, it } from 'vitest'
import { legacyQuestionKey } from './url'

describe('legacyQuestionKey', () => {
  const keys = ['iface.javascript:js-001', 'local.mine-ab12:js-001', 'iface.go:go-001']

  it('maps an old official id to its bank-scoped key', () => {
    expect(legacyQuestionKey('js-001', keys)).toBe('iface.javascript:js-001')
    expect(legacyQuestionKey('go-001', keys)).toBe('iface.go:go-001')
  })

  it('leaves new keys and unknown ids alone', () => {
    expect(legacyQuestionKey('iface.go:go-001', keys)).toBeNull()
    expect(legacyQuestionKey('missing', keys)).toBeNull()
    expect(legacyQuestionKey('', keys)).toBeNull()
  })
})
