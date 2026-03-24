import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spinner } from '@/components/ui'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import {
  getActiveModules,
  getCategoryMap,
  getCustomSources,
  removeCustomSource,
  unregisterModuleFromCategories,
} from '@/lib/db'
import { importCustomQuestions, isJSONFile, isMDFile, parseJSONSafe } from '@/lib/questionLoader'
import { mdToQuestions } from '@/pages/PromptPage'

// ─── Result Toast ─────────────────────────────────────────────────────────────

interface ImportResult {
  source: string
  loaded: number
  errors: { index: number; message: string }[]
  warnings: string[]
}

function ResultToast({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0
  const success = result.loaded > 0

  return (
    <div
      className="animate-scale-in"
      style={{
        borderRadius: 14,
        border: '1px solid',
        borderColor: success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
        background: success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {success ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: success ? '#10b981' : '#ef4444',
              }}
            >
              {success ? `成功导入 ${result.loaded} 道题` : '导入失败，没有有效题目'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              来源：{result.source}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            color: 'var(--text-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            padding: 2,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {hasWarnings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>
            警告（{result.warnings.length}）
          </p>
          <div
            style={{
              maxHeight: 80,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {result.warnings.map((w) => (
              <p key={w} style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {hasErrors && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
            无效题目（{result.errors.length} 条）
          </p>
          <div
            style={{
              maxHeight: 100,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {result.errors.slice(0, 5).map((e) => (
              <p key={`${e.index}-${e.message}`} style={{ fontSize: 11, color: 'var(--text-3)' }}>
                [{e.index === -1 ? '格式' : `第${e.index + 1}条`}] {e.message}
              </p>
            ))}
            {result.errors.length > 5 && (
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                还有 {result.errors.length - 5} 个错误
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

function DropZone({
  onFiles,
  loading,
  category,
  onCategoryChange,
}: {
  onFiles: (files: File[], category: string) => void
  loading: boolean
  category: string
  onCategoryChange: (v: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => isJSONFile(f) || isMDFile(f))
      if (files.length > 0) onFiles(files, category)
    },
    [onFiles, category],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) => isJSONFile(f) || isMDFile(f))
      if (files.length > 0) onFiles(files, category)
      e.target.value = ''
    },
    [onFiles, category],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Category input */}
      <div>
        <label
          htmlFor="import-file-category"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-2)',
            marginBottom: 6,
          }}
        >
          分类名称
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              color: 'var(--text-3)',
              fontWeight: 400,
            }}
          >
            （留空则自动从文件名推断，如"Go"、"Java"）
          </span>
        </label>
        <input
          id="import-file-category"
          type="text"
          placeholder="例如：Go、Java、系统设计…"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input-base"
          style={{ borderRadius: 10 }}
        />
      </div>

      {/* Drop area */}
      <button
        type="button"
        disabled={loading}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          minHeight: 180,
          width: '100%',
          borderRadius: 14,
          border: '2px dashed',
          borderColor: dragging ? 'var(--primary)' : 'var(--border)',
          background: dragging ? 'var(--primary-light)' : 'transparent',
          transform: dragging ? 'scale(1.01)' : 'scale(1)',
          transition: 'all 0.2s',
          cursor: loading ? 'default' : 'pointer',
          userSelect: 'none',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json,.md,.markdown,text/markdown"
          multiple
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Spinner size="lg" className="text-(--primary)" />
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>导入中…</p>
          </div>
        ) : (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: dragging ? 'var(--primary)' : 'var(--surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={dragging ? 'white' : 'var(--text-3)'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {dragging ? '松开以导入' : '拖拽文件到此处'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                或点击选择文件（支持多选）
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['.json', '.md'].map((ext) => (
                <span
                  key={ext}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 5,
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {ext}
                </span>
              ))}
            </div>
          </>
        )}
      </button>
    </div>
  )
}

// ─── JSON Paste Panel ─────────────────────────────────────────────────────────

function PastePanel({
  onImport,
  loading,
}: {
  onImport: (json: string, source: string, category: string) => void
  loading: boolean
}) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) {
      setError('请粘贴 JSON 内容')
      return
    }
    if (!source.trim()) {
      setError('请填写来源名称')
      return
    }
    const parsed = parseJSONSafe(text.trim())
    if (!parsed.ok) {
      setError(`JSON 格式错误：${parsed.error}`)
      return
    }
    setError('')
    onImport(text.trim(), source.trim(), category.trim())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
        className="paste-fields-grid"
      >
        <div>
          <label
            htmlFor="import-paste-source"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-2)',
              marginBottom: 6,
            }}
          >
            来源名称 <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="import-paste-source"
            type="text"
            placeholder="例如：字节跳动、我的项目专题…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input-base"
            style={{ borderRadius: 10 }}
          />
        </div>
        <div>
          <label
            htmlFor="import-paste-category"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-2)',
              marginBottom: 6,
            }}
          >
            分类名称
            <span
              style={{
                marginLeft: 5,
                fontSize: 11,
                color: 'var(--text-3)',
                fontWeight: 400,
              }}
            >
              （可选）
            </span>
          </label>
          <input
            id="import-paste-category"
            type="text"
            placeholder="例如：Go、Java、系统设计…"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-base"
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="import-paste-json"
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-2)',
            marginBottom: 6,
          }}
        >
          JSON 内容 <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <textarea
          id="import-paste-json"
          placeholder={`粘贴题目 JSON 数组，格式：\n[\n  {\n    "id": "my-001",\n    "module": "Golang",\n    "difficulty": 2,\n    "question": "题目内容",\n    "answer": "## 参考答案\\n...",\n    "tags": ["goroutine"],\n    "source": "高频"\n  }\n]`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="input-base"
          style={{
            borderRadius: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: 'var(--surface-2)',
            resize: 'vertical',
            minHeight: 180,
          }}
        />
      </div>

      {error && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      <Button
        variant="primary"
        fullWidth
        loading={loading}
        onClick={handleSubmit}
        icon={
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        }
      >
        导入题目
      </Button>
    </div>
  )
}

// ─── Categories Display ───────────────────────────────────────────────────────

function CategoriesDisplay() {
  const [catMap, setCatMap] = useState<Record<
    string,
    { name: string; modules: string[]; builtin: boolean }
  > | null>(null)

  useEffect(() => {
    getCategoryMap().then(setCatMap)
  }, [])

  if (!catMap || Object.keys(catMap).length === 0) return null

  const entries = Object.values(catMap).sort((a, b) => {
    // builtin first
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map((cat) => (
        <div
          key={cat.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              minWidth: 60,
              flexShrink: 0,
            }}
          >
            {cat.name}
          </span>
          {cat.builtin && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--primary)',
                background: 'var(--primary-light)',
                border: '1px solid rgba(var(--primary-rgb),0.2)',
                borderRadius: 4,
                padding: '1px 6px',
                flexShrink: 0,
              }}
            >
              内置
            </span>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
              flex: 1,
              minWidth: 0,
            }}
          >
            {cat.modules.map((m) => (
              <span
                key={m}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: 'var(--surface-3)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m}
              </span>
            ))}
            {cat.modules.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>暂无模块</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Custom Sources Manager ───────────────────────────────────────────────────

function SourcesManager({
  sources,
  onRemove,
}: {
  sources: string[]
  onRemove: (source: string) => void
}) {
  if (sources.length === 0) {
    return (
      <div
        style={{
          padding: '28px 16px',
          textAlign: 'center',
          color: 'var(--text-3)',
          fontSize: 13,
        }}
      >
        暂无自定义来源，导入题目后会在这里显示
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sources.map((source) => (
        <div
          key={source}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {source}
          </span>
          <button
            type="button"
            onClick={() => onRemove(source)}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 7,
              fontSize: 12,
              color: 'var(--danger)',
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            删除
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── JSON Schema Preview ──────────────────────────────────────────────────────

const SCHEMA_EXAMPLE = `[
  {
    "id": "unique-id-001",
    "module": "React",
    "difficulty": 2,
    "question": "解释 React Hooks 的规则",
    "answer": "## Hooks 规则\\n\\n只在**顶层**调用 Hook...",
    "tags": ["hooks", "规则"],
    "source": "高频"
  }
]`

const MODULE_VALUES = [
  'JS基础',
  'React',
  '性能优化',
  '网络',
  'CSS',
  'TypeScript',
  '手写题',
  '项目深挖',
]

function SchemaGuide() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--surface-2)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>JSON 格式说明</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: 'var(--text-3)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div
          className="animate-fade-in"
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Field table */}
          <div
            style={{
              overflowX: 'auto',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
              }}
            >
              <thead style={{ background: 'var(--surface-2)' }}>
                <tr>
                  {['字段', '类型', '必填', '说明'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--text-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['id', 'string', '必填', '唯一标识符'],
                  ['module', 'enum', '必填', MODULE_VALUES.join(' | ')],
                  ['difficulty', '1 | 2 | 3', '必填', '初级 | 中级 | 高级'],
                  ['question', 'string', '必填', '题目内容'],
                  ['answer', 'string (Markdown)', '必填', '参考答案，支持 Markdown'],
                  ['tags', 'string[]', '必填', '标签数组（可为空数组）'],
                  ['source', 'string', '可选', '来源标注，如"高频" "字节"'],
                ].map(([field, type, required, desc], i) => (
                  <tr
                    key={field}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <td
                      style={{
                        padding: '7px 12px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--primary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field}
                    </td>
                    <td
                      style={{
                        padding: '7px 12px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {type}
                    </td>
                    <td
                      style={{
                        padding: '7px 12px',
                        color: required === '必填' ? 'var(--success)' : 'var(--text-3)',
                        whiteSpace: 'nowrap',
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {required}
                    </td>
                    <td
                      style={{
                        padding: '7px 12px',
                        color: 'var(--text-2)',
                        fontSize: 11,
                      }}
                    >
                      {desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Example */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-2)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              示例
            </p>
            <pre
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '12px 14px',
                overflowX: 'auto',
                color: 'var(--text)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {SCHEMA_EXAMPLE}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'file' | 'paste'

export default function ImportPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('file')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [customSources, setCustomSources] = useState<string[]>([])
  const [fileCategory, setFileCategory] = useState('')

  // Load existing custom sources
  useEffect(() => {
    getCustomSources().then(setCustomSources)
  }, [])

  // ── Import handler ──
  const handleImport = useCallback(
    async (data: unknown, sourceName: string, categoryName: string) => {
      setLoading(true)
      try {
        const result = await importCustomQuestions(data, sourceName, categoryName || undefined)
        setResults((prev) => [result, ...prev])

        if (result.loaded > 0) {
          // Refresh custom sources list
          const updated = await getCustomSources()
          setCustomSources(updated)
          // Invalidate in-memory cache so question list refreshes
          invalidateQuestionsCache()
        }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // ── File drop handler ──
  const handleFiles = useCallback(
    async (files: File[], category: string) => {
      setLoading(true)
      for (const file of files) {
        const text = await file.text()

        // Handle .md files: convert via mdToQuestions first
        if (isMDFile(file)) {
          const { questions, errors } = mdToQuestions(text)
          if (questions.length === 0) {
            setResults((prev) => [
              {
                source: file.name,
                loaded: 0,
                errors: errors.map((msg, i) => ({ index: i, message: msg })),
                warnings: [],
              },
              ...prev,
            ])
            continue
          }
          const sourceName = file.name.replace(/\.(md|markdown)$/i, '')
          await handleImport(questions, sourceName, category)
          continue
        }

        // Handle .json files
        const parsed = parseJSONSafe(text)
        if (!parsed.ok) {
          setResults((prev) => [
            {
              source: file.name,
              loaded: 0,
              errors: [{ index: -1, message: `JSON 解析失败：${parsed.error}` }],
              warnings: [],
            },
            ...prev,
          ])
          continue
        }
        await handleImport(parsed.data, file.name.replace(/\.json$/i, ''), category)
      }
      setLoading(false)
    },
    [handleImport],
  )

  // ── Paste handler ──
  const handlePaste = useCallback(
    async (json: string, source: string, category: string) => {
      const parsed = parseJSONSafe(json)
      if (!parsed.ok) {
        setResults((prev) => [
          {
            source,
            loaded: 0,
            errors: [{ index: -1, message: `JSON 解析失败：${parsed.error}` }],
            warnings: [],
          },
          ...prev,
        ])
        return
      }
      await handleImport(parsed.data, source, category)
    },
    [handleImport],
  )

  // ── Remove source ──
  const handleRemoveSource = useCallback(async (source: string) => {
    if (!confirm(`确定要删除来源「${source}」的所有题目吗？此操作不可撤销。`)) return
    const { deleteQuestionsBySource } = await import('@/lib/db')
    // Before deleting, find which modules belong to this source
    const { getAllQuestions } = await import('@/lib/db')
    const all = await getAllQuestions()
    const affectedModules = [
      ...new Set(
        all
          .filter((q) => q.source === `custom_${source}` || q.source === source)
          .map((q) => q.module),
      ),
    ]
    await deleteQuestionsBySource(source)
    await removeCustomSource(source)
    // Unregister modules that no longer have any questions
    const remaining = await getActiveModules()
    for (const mod of affectedModules) {
      if (!remaining.includes(mod)) {
        await unregisterModuleFromCategories(mod)
      }
    }
    const updated = await getCustomSources()
    setCustomSources(updated)
    invalidateQuestionsCache()
  }, [])

  return (
    <div
      className="page-container"
      style={{
        maxWidth: 760,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* ── Header ── */}
      <div className="animate-fade-in">
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.015em',
            marginBottom: 4,
          }}
        >
          导入题目
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          支持拖拽 JSON 文件或粘贴 JSON 内容，让 AI 按格式生成后直接导入
        </p>
      </div>

      {/* ── Import Card ── */}
      <div
        className="card animate-fade-in stagger-1"
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            background: 'var(--surface-2)',
            borderRadius: 10,
            width: 'fit-content',
          }}
        >
          {(
            [
              { key: 'file', label: '文件导入' },
              { key: 'paste', label: '粘贴 JSON' },
            ] as const
          ).map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '5px 16px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: tab === key ? 'var(--surface)' : 'transparent',
                color: tab === key ? 'var(--text)' : 'var(--text-2)',
                boxShadow: tab === key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'file' ? (
          <DropZone
            onFiles={handleFiles}
            loading={loading}
            category={fileCategory}
            onCategoryChange={setFileCategory}
          />
        ) : (
          <PastePanel onImport={handlePaste} loading={loading} />
        )}
      </div>

      {/* ── Results ── */}
      {results.length > 0 && (
        <div
          className="animate-fade-in"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              导入结果
            </p>
            <button
              type="button"
              onClick={() => setResults([])}
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              清除
            </button>
          </div>
          {results.map((r, i) => (
            <ResultToast
              key={`${r.source}-${r.loaded}-${r.errors.length}-${r.warnings.length}`}
              result={r}
              onDismiss={() => setResults((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {results.some((r) => r.loaded > 0) && (
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/questions')}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                }
              >
                查看题库
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/practice')}>
                开始练习
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Schema Guide ── */}
      <div className="animate-fade-in stagger-2">
        <SchemaGuide />
      </div>

      {/* ── Category Overview ── */}
      <div
        className="animate-fade-in stagger-3"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          分类总览
        </p>
        <CategoriesDisplay />
      </div>

      {/* ── Custom Sources Manager ── */}
      <div
        className="animate-fade-in stagger-3"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            已导入的自定义来源
          </p>
          {customSources.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {customSources.length} 个来源
            </span>
          )}
        </div>
        <SourcesManager sources={customSources} onRemove={handleRemoveSource} />
      </div>

      {/* ── Tip card ── */}
      <style>{`
				@media (max-width: 600px) {
					.paste-fields-grid {
						grid-template-columns: 1fr !important;
					}
				}
			`}</style>
      <div className="animate-fade-in stagger-4">
        <div
          className="card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            borderColor: 'rgba(var(--primary-rgb), 0.15)',
            background: 'var(--primary-light)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>用 AI 生成题目</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              复制本页的 JSON 格式说明，配合项目提示词让 AI 生成题目。 生成完成后粘贴到「粘贴
              JSON」区域即可一键导入，ID 重复时会自动加前缀避免冲突。
            </p>
            <button
              type="button"
              onClick={() => navigate('/prompt')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginTop: 2,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              查看 AI 出题 Prompt
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
