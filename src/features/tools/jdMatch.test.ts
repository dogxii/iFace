import { describe, expect, it } from 'vitest'
import {
  buildJdMatchMessages,
  extractGeneratedTitle,
  extractMatchScore,
  stripGeneratedTitle,
} from './jdMatch'

describe('jd match report helpers', () => {
  it('extracts and strips a 标题 line', () => {
    const md = '标题：React 岗位高度匹配\n\n## 总体判断\n不错'
    expect(extractGeneratedTitle(md, '前端')).toBe('React 岗位高度匹配')
    expect(stripGeneratedTitle(md)).toBe('## 总体判断\n不错')
  })

  it('treats a leading non-section heading as the title', () => {
    const md = '# **全栈岗诊断**\n## 匹配点\n- a'
    expect(extractGeneratedTitle(md, '前端')).toBe('全栈岗诊断')
    expect(stripGeneratedTitle(md)).toBe('## 匹配点\n- a')
  })

  it('does not treat a report section as the title', () => {
    const md = '## 总体判断\n匹配分：72'
    expect(extractGeneratedTitle(md, '后端工程师')).toBe('后端工程师 · JD 诊断')
    expect(stripGeneratedTitle(md)).toBe(md)
  })

  it('finds the match score in common phrasings', () => {
    expect(extractMatchScore('## 总体判断\n匹配分：72 分')).toBe(72)
    expect(extractMatchScore('整体匹配度 **85**/100')).toBe(85)
    expect(extractMatchScore('得分 64/100')).toBe(64)
    expect(extractMatchScore('没有分数')).toBeNull()
    expect(extractMatchScore('匹配分：180')).toBeNull()
  })

  it('embeds the role, JD and resume in the prompt', () => {
    const [, user] = buildJdMatchMessages({ roleTitle: '', jdText: 'JD!', resumeText: 'CV!' })
    expect(user.content).toContain('目标岗位：前端工程师')
    expect(user.content).toContain('<JD>\nJD!\n</JD>')
    expect(user.content).toContain('<简历>\nCV!\n</简历>')
  })
})
