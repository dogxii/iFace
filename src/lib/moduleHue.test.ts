import { describe, expect, it } from 'vitest'
import { MODULE_HUES, moduleHue } from './moduleHue'

describe('moduleHue', () => {
  it('uses the hue the bank asked for', () => {
    expect(moduleHue('React', 'cyan')).toBe('cyan')
    expect(moduleHue('React', 'not-a-hue')).toBe(moduleHue('React'))
  })

  it('hashes custom modules onto the palette, stably', () => {
    const hue = moduleHue('我的自定义模块')
    expect(MODULE_HUES).toContain(hue)
    expect(moduleHue('我的自定义模块')).toBe(hue)
  })

  it('spreads custom modules across more than one hue', () => {
    const hues = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name) => moduleHue(name)))
    expect(hues.size).toBeGreaterThan(3)
  })
})
