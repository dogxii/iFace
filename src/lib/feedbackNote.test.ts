import { describe, expect, it } from 'vitest'
import { buildReviewNoteMarkdown } from './feedbackNote'

describe('buildReviewNoteMarkdown', () => {
  it('builds sections in order and trims content', () => {
    const md = buildReviewNoteMarkdown({
      questionText: '  什么是闭包？ ',
      userAnswer: ' 函数加环境 ',
      feedback: ' 不错 ',
      timestamp: new Date(2026, 0, 2, 3, 4).getTime(),
    })
    const lines = md.split('\n')
    expect(lines[0]).toMatch(/^## AI 复盘 · /)
    expect(md.indexOf('### 题目')).toBeLessThan(md.indexOf('### 我的作答'))
    expect(md.indexOf('### 我的作答')).toBeLessThan(md.indexOf('### AI 点评'))
    expect(lines).toContain('什么是闭包？')
    expect(lines).toContain('函数加环境')
    expect(lines.at(-1)).toBe('不错')
  })

  it('marks an empty answer as not filled', () => {
    const md = buildReviewNoteMarkdown({ questionText: 'Q', userAnswer: '   ', feedback: 'F' })
    expect(md).toContain('（未填写）')
  })
})
