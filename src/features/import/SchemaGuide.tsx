import { ChevronDown, FileCode2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { REPO_URL } from '@/features/settings/about'
import { Box, SegmentedControl } from '@/ui'

const FIELDS: [field: string, type: string, required: boolean, description: string][] = [
  ['question', 'string', true, '题目，最长 2000 字'],
  ['answer', 'string', true, '参考答案，支持 Markdown'],
  ['module', 'string', false, '模块名，同名的题会放进同一个模块；不填则用题库名'],
  ['difficulty', '1 | 2 | 3', false, '初级 / 中级 / 高级，默认 2'],
  ['tags', 'string[]', false, '标签，最多 10 个'],
  ['id', 'string', false, '同一题库里 id 相同的题会被覆盖更新；不填则按题目内容去重'],
  ['source', 'string', false, '出处标注，如「高频」或公司名'],
]

const JSON_EXAMPLE = `[
  {
    "id": "react-001",
    "module": "React",
    "difficulty": 2,
    "question": "解释 React Hooks 的规则",
    "answer": "## Hooks 规则\\n\\n只在**顶层**调用 Hook…",
    "tags": ["hooks"]
  }
]`

const MARKDOWN_EXAMPLE = `## Q: 解释 React Hooks 的规则
**模块**: React
**难度**: 中级
**标签**: hooks, 规则

只在**顶层**调用 Hook，不要在循环、条件或嵌套函数中调用…

---

## Q: 下一道题
…`

export function SchemaGuide() {
  const [format, setFormat] = useState<'json' | 'markdown'>('json')
  return (
    <Box className="overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 select-none hover:bg-subtle">
          <FileCode2 className="size-4 text-fg-subtle" />
          <span className="text-sm font-semibold text-fg">格式说明</span>
          <span className="text-xs text-fg-subtle max-sm:hidden">JSON 字段与 Markdown 写法</span>
          <ChevronDown className="ml-auto size-4 text-fg-subtle transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-subtle text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">字段</th>
                  <th className="px-3 py-2 font-medium">类型</th>
                  <th className="px-3 py-2 font-medium">必填</th>
                  <th className="px-3 py-2 font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {FIELDS.map(([field, type, required, description]) => (
                  <tr key={field}>
                    <td className="px-3 py-2 font-mono text-fg">{field}</td>
                    <td className="px-3 py-2 font-mono text-fg-muted">{type}</td>
                    <td className="px-3 py-2 text-fg-muted">{required ? '是' : '否'}</td>
                    <td className="px-3 py-2 text-fg-muted">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-fg-muted">示例</span>
              <SegmentedControl
                size="sm"
                value={format}
                onValueChange={setFormat}
                label="示例格式"
                options={[
                  { value: 'json', label: 'JSON' },
                  { value: 'markdown', label: 'Markdown' },
                ]}
              />
            </div>
            <pre className="overflow-x-auto rounded-lg border border-line bg-subtle px-4 py-3 font-mono text-xs leading-relaxed text-fg">
              {format === 'json' ? JSON_EXAMPLE : MARKDOWN_EXAMPLE}
            </pre>
          </div>

          <p className="text-xs text-fg-subtle">
            不想手写？在{' '}
            <Link to="/prompt" className="text-accent hover:underline">
              出题
            </Link>{' '}
            页复制 Prompt，让任意 AI 按这个格式批量生成题目。想分享整套题库，可以把题库导出为
            iface-bank 题库包（
            <a
              href={`${REPO_URL}/blob/main/docs/bank-format.md`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              格式说明
            </a>
            ），放进带 iface-bank 话题的 GitHub 仓库。
          </p>
        </div>
      </details>
    </Box>
  )
}
