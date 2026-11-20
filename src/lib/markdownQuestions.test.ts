import { describe, expect, it } from 'vitest'
import { mdToQuestions } from './markdownQuestions'

const MD = `## Q: 什么是闭包？
**模块**: js
**难度**: 中级
**标签**: 闭包, 作用域
**来源**: 高频

闭包是函数和其词法环境的组合。

---

## 2. 说说 RAG 的流程
**模块**: RAG
**难度**: hard
**ID**: rag-custom

1. 检索
2. 生成

---

## 没有模块的题
**难度**: 初级

答案

---

## Q: 空答案
**模块**: CSS
`

describe('mdToQuestions', () => {
  const { questions, errors } = mdToQuestions(MD)

  it('parses blocks with aliases, difficulty and tags', () => {
    expect(questions).toHaveLength(2)
    expect(questions[0]).toEqual({
      id: 'js-001',
      module: 'JS基础',
      difficulty: 2,
      question: '什么是闭包？',
      answer: '闭包是函数和其词法环境的组合。',
      tags: ['闭包', '作用域'],
      source: '高频',
    })
    expect(questions[1]).toMatchObject({
      id: 'rag-custom',
      module: 'RAG与知识库',
      difficulty: 3,
      question: '说说 RAG 的流程',
      tags: [],
    })
  })

  it('reports blocks missing a module or an answer', () => {
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('缺少模块')
    expect(errors[1]).toContain('答案为空')
  })

  it('reports blocks without a heading', () => {
    expect(mdToQuestions('只是一段文字').errors[0]).toContain('未找到题目标题')
  })
})
