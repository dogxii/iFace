import { describe, expect, it } from 'vitest'
import { buildCustomPrompt, DIFFICULTY_MIXES, difficultyCounts, PRESETS } from './promptPresets'

describe('prompt presets', () => {
  it('have unique ids and non-empty prompts', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    for (const preset of PRESETS) expect(preset.prompt.length).toBeGreaterThan(200)
  })

  it('split difficulty counts so they always add up', () => {
    for (const { value } of DIFFICULTY_MIXES) {
      for (const count of [10, 33, 60, 101]) {
        const [a, b, c] = difficultyCounts(value, count)
        expect(a + b + c).toBe(count)
        expect(Math.min(a, b, c)).toBeGreaterThanOrEqual(0)
      }
    }
    expect(difficultyCounts('senior', 50)).toEqual([0, 30, 20])
  })

  it('builds a custom prompt with module, counts and extra context', () => {
    const prompt = buildCustomPrompt({
      module: 'Rust',
      count: 40,
      mix: 'standard',
      extra: '侧重所有权',
    })
    expect(prompt).toContain('Rust')
    expect(prompt).toContain('- 初级：12 道')
    expect(prompt).toContain('- 中级：20 道')
    expect(prompt).toContain('侧重所有权')
  })
})
