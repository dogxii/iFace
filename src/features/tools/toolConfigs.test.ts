import { describe, expect, it } from 'vitest'
import { buildMessages, createInitialValues, TOOL_CONFIGS, TOOL_MAP } from './toolConfigs'

describe('AI tool configs', () => {
  it('have unique ids and at least one required field', () => {
    expect(new Set(TOOL_CONFIGS.map((t) => t.id)).size).toBe(TOOL_CONFIGS.length)
    for (const tool of TOOL_CONFIGS) {
      expect(tool.fields.some((f) => f.required)).toBe(true)
    }
  })

  it('builds a system + user message with every field, marking blanks', () => {
    const tool = TOOL_MAP.get('self-intro')
    if (!tool) throw new Error('missing tool')
    const values = { ...createInitialValues(tool), role: '前端工程师', background: '  ' }
    const [system, user] = buildMessages(tool, values)
    expect(system.role).toBe('system')
    expect(user.content).toContain('请完成工具「自我介绍」')
    expect(user.content).toContain('## 目标岗位\n前端工程师')
    expect(user.content).toContain('## 个人背景\n未提供')
    expect(user.content).toContain('## 输出要求')
  })
})
