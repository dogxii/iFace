import { describe, expect, it } from 'vitest'
import { toDateKey } from './date'

describe('toDateKey', () => {
  it('uses the local calendar day', () => {
    // 00:30 local time is still "today" locally, whatever the UTC date is.
    const justAfterMidnight = new Date(2026, 10, 24, 0, 30).getTime()
    expect(toDateKey(justAfterMidnight)).toBe('2026-11-24')
    expect(toDateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05')
  })
})
