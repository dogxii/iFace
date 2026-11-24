import { describe, expect, it } from 'vitest'
import { MODULE_HUES, moduleHue } from './moduleHue'

describe('moduleHue', () => {
  it('uses the hand-picked hue for built-in modules', () => {
    expect(moduleHue('React')).toBe('cyan')
    expect(moduleHue('JS基础')).toBe('amber')
  })

  it('hashes custom modules onto the palette, stably', () => {
    const hue = moduleHue('我的自定义模块')
    expect(MODULE_HUES).toContain(hue)
    expect(moduleHue('我的自定义模块')).toBe(hue)
  })

  it('spreads custom modules across more than one hue', () => {
    const hues = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(moduleHue))
    expect(hues.size).toBeGreaterThan(3)
  })
})
