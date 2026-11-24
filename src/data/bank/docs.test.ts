/** Keeps the examples in the published format docs valid. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseChecksMarkdown } from './checksMarkdown'
import { parseMarkdownQuestions } from './markdown'
import { bankIsValid, resolveBank } from './validate'

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8')

function fencedBlocks(md: string, lang: string): string[] {
  const pattern = new RegExp(`^(\`{3,})${lang}\\n([\\s\\S]*?)^\\1$`, 'gm')
  return [...md.matchAll(pattern)].map((match) => match[2])
}

describe('docs/bank-format.md', () => {
  const doc = read('docs/bank-format.md')
  const [markdownExample, checksExample] = fencedBlocks(doc, 'markdown')
  const jsonExamples = fencedBlocks(doc, 'json')

  it('has a Markdown question file example that parses', () => {
    const { questions, issues } = parseMarkdownQuestions(markdownExample)
    expect(issues).toEqual([])
    expect(questions.map((q) => q.id)).toEqual(['basics-001', 'basics-002'])
    expect(questions[1].question).toContain('```go')
  })

  it('has manifest examples that validate', async () => {
    const manifests = jsonExamples.filter((text) => text.includes('"format"'))
    expect(manifests.length).toBe(2)
    for (const text of manifests) {
      // Every module gets the example file with its own ids, so modules do not collide.
      const readFile = async (path: string) => {
        const name = path.split('/').pop()?.replace('.md', '')
        const example = path.startsWith('checks/') ? checksExample : markdownExample
        return example.replaceAll('basics-', `${name}-`)
      }
      const result = await resolveBank(text, readFile)
      expect(result.issues).toEqual([])
      expect(bankIsValid(result)).toBe(true)
    }
  })

  it('has a learning check example that validates', async () => {
    const question = JSON.parse(jsonExamples.find((text) => text.includes('"answerIds"')) ?? '')
    const manifest = {
      format: 'iface-bank@1',
      name: 'x',
      version: '1.0.0',
      license: 'MIT',
      modules: [{ id: 'm', name: 'M', questions: [question] }],
    }
    const result = await resolveBank(JSON.stringify(manifest))
    expect(result.issues).toEqual([])
  })

  it('has a checks file example that parses', () => {
    const { byQuestion, issues } = parseChecksMarkdown(checksExample)
    expect(issues).toEqual([])
    expect(byQuestion.get('basics-001')?.checks).toHaveLength(2)
  })
})

describe('public/llms.txt', () => {
  it('has a Markdown question file example that parses', () => {
    const example = fencedBlocks(read('public/llms.txt'), '')[0]
    const { questions, issues } = parseMarkdownQuestions(example)
    expect(issues).toEqual([])
    expect(questions).toHaveLength(2)
  })
})
