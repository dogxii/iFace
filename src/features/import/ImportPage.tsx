import {
  BookOpen,
  CircleAlert,
  CircleCheck,
  ClipboardPaste,
  Database,
  FileUp,
  FlaskConical,
  Play,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { invalidateQuestionsCache, useQuestions } from '@/hooks/useQuestions'
import {
  type CategoryEntry,
  deleteQuestionsBySource,
  getActiveModules,
  getAllQuestions,
  getCategoryMap,
  getCustomSources,
  removeCustomSource,
  unregisterModuleFromCategories,
} from '@/lib/db'
import {
  BUILTIN_MODULE_FILES,
  BUILTIN_QUESTIONS_VERSION,
  type CustomImportResult,
  importCustomQuestions,
  isJSONFile,
  isMDFile,
  loadAllBuiltinModulesParallel,
} from '@/lib/questionLoader'
import {
  Box,
  Breadcrumb,
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  Field,
  Input,
  PageHeader,
  PageTitle,
  SegmentedControl,
  Spinner,
  Tag,
  Textarea,
  toast,
} from '@/ui'
import {
  countBySource,
  detectPasteFormat,
  type PasteFormat,
  parseImportText,
  sourceNameFromFile,
} from './importData'
import { SchemaGuide } from './SchemaGuide'

type Mode = 'file' | 'paste'

interface Library {
  builtinCount: number | null
  categories: CategoryEntry[]
  sources: string[]
  sourceCounts: Record<string, number>
}

const EMPTY_LIBRARY: Library = { builtinCount: null, categories: [], sources: [], sourceCounts: {} }

async function loadLibrary(): Promise<Library> {
  const [questions, categoryMap, sources] = await Promise.all([
    getAllQuestions(),
    getCategoryMap(),
    getCustomSources(),
  ])
  return {
    builtinCount: questions.filter((q) => !q.id.startsWith('custom_')).length,
    categories: Object.values(categoryMap).sort((a, b) =>
      a.builtin !== b.builtin ? (a.builtin ? -1 : 1) : a.name.localeCompare(b.name, 'zh-CN'),
    ),
    sources,
    sourceCounts: countBySource(questions, sources),
  }
}

export default function ImportPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('file')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<CustomImportResult[]>([])
  const [library, setLibrary] = useState<Library>(EMPTY_LIBRARY)
  const [category, setCategory] = useState('')

  const { allQuestions } = useQuestions()
  const refresh = useCallback(async () => setLibrary(await loadLibrary()), [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read when the bank changes size, e.g. when the bundled import finishes in the background
  useEffect(() => {
    refresh()
  }, [allQuestions.length, refresh])

  const pushResult = (result: CustomImportResult) => setResults((prev) => [result, ...prev])

  const importData = async (data: unknown, source: string, skipped: string[] = []) => {
    const result = await importCustomQuestions(data, source, category.trim() || undefined)
    pushResult({
      ...result,
      warnings: [...skipped.map((m) => `已跳过：${m}`), ...result.warnings],
    })
    if (result.loaded > 0) invalidateQuestionsCache()
    return result
  }

  const handleFiles = async (files: File[]) => {
    const usable = files.filter((f) => isJSONFile(f) || isMDFile(f))
    if (usable.length === 0) {
      toast.error('只支持 .json 和 .md 文件')
      return
    }
    setBusy(true)
    try {
      for (const file of usable) {
        const parsed = parseImportText(await file.text(), isMDFile(file) ? 'markdown' : 'json')
        if (!parsed.ok) {
          pushResult({
            source: file.name,
            loaded: 0,
            errors: parsed.errors.map((message) => ({ index: -1, message })),
            warnings: [],
          })
          continue
        }
        await importData(parsed.data, sourceNameFromFile(file.name), parsed.skipped)
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handlePaste = async (text: string, source: string, format: PasteFormat) => {
    const parsed = parseImportText(text, format)
    if (!parsed.ok) {
      pushResult({
        source,
        loaded: 0,
        errors: parsed.errors.map((message) => ({ index: -1, message })),
        warnings: [],
      })
      return false
    }
    setBusy(true)
    try {
      const result = await importData(parsed.data, source, parsed.skipped)
      await refresh()
      return result.loaded > 0
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveSource = async (source: string) => {
    const all = await getAllQuestions()
    const affected = [
      ...new Set(
        all
          .filter((q) => q.source === `custom_${source}` || q.source === source)
          .map((q) => q.module),
      ),
    ]
    await deleteQuestionsBySource(source)
    await removeCustomSource(source)
    const remaining = await getActiveModules()
    for (const module of affected) {
      if (!remaining.includes(module)) await unregisterModuleFromCategories(module)
    }
    invalidateQuestionsCache()
    await refresh()
    toast.success(`已删除来源「${source}」`)
  }

  const imported = results.reduce((sum, r) => sum + r.loaded, 0)

  return (
    <>
      <PageHeader
        title={<Breadcrumb items={[{ label: '导入题库' }]} />}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/prompt">
              <FlaskConical />用 AI 出题
            </Link>
          </Button>
        }
      />
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle
          title="导入题库"
          description="导入 JSON 或 Markdown 格式的题目，所有数据只保存在本地浏览器。"
        />

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Box>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <SegmentedControl
                  value={mode}
                  onValueChange={setMode}
                  label="导入方式"
                  size="sm"
                  options={[
                    { value: 'file', label: '上传文件', icon: <FileUp /> },
                    { value: 'paste', label: '粘贴内容', icon: <ClipboardPaste /> },
                  ]}
                />
                <CategoryInput
                  value={category}
                  onChange={setCategory}
                  categories={library.categories}
                />
              </div>
              <div className="p-4">
                {mode === 'file' ? (
                  <FileDrop busy={busy} onFiles={handleFiles} />
                ) : (
                  <PastePanel busy={busy} onImport={handlePaste} />
                )}
              </div>
            </Box>

            {results.length > 0 ? (
              <section aria-label="导入结果" className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-fg">导入结果</h2>
                  <Button variant="ghost" size="sm" onClick={() => setResults([])}>
                    清除
                  </Button>
                </div>
                {results.map((result, index) => (
                  <ResultCard
                    // biome-ignore lint/suspicious/noArrayIndexKey: results are append-only
                    key={`${result.source}-${results.length - index}`}
                    result={result}
                    onDismiss={() => setResults((prev) => prev.filter((_, i) => i !== index))}
                  />
                ))}
                {imported > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="sm" onClick={() => navigate('/questions')}>
                      <BookOpen />
                      查看题库
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/practice')}>
                      <Play />
                      开始练习
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            <SchemaGuide />
          </div>

          <aside className="flex min-w-0 flex-col gap-5">
            <BuiltinLibrary count={library.builtinCount} onLoaded={refresh} />
            <SourcesList
              sources={library.sources}
              counts={library.sourceCounts}
              onRemove={handleRemoveSource}
            />
            <CategoriesList categories={library.categories} />
          </aside>
        </div>
      </div>
    </>
  )
}

// ─── Inputs ─────────────────────────────────────────────────────────────────────

function CategoryInput({
  value,
  onChange,
  categories,
}: {
  value: string
  onChange: (value: string) => void
  categories: CategoryEntry[]
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="import-category" className="text-xs whitespace-nowrap text-fg-muted">
        归入分类
      </label>
      <Input
        id="import-category"
        list="import-category-options"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="自动（按模块）"
        className="h-8 w-40 text-sm"
      />
      <datalist id="import-category-options">
        {categories.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
    </div>
  )
}

function FileDrop({ busy, onFiles }: { busy: boolean; onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".json,.md,.markdown,application/json,text/markdown"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length > 0) onFiles(files)
        }}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition-colors',
          dragging
            ? 'border-accent bg-accent-subtle'
            : 'border-line-strong hover:border-accent hover:bg-subtle',
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-line bg-canvas">
          {busy ? (
            <Spinner className="text-accent" />
          ) : (
            <Upload className="size-4.5 text-fg-muted" />
          )}
        </span>
        <span className="text-md font-medium text-fg">
          {busy ? '正在导入…' : dragging ? '松开即可导入' : '拖入文件，或点击选择'}
        </span>
        <span className="text-sm text-fg-subtle">
          支持多个 .json / .md 文件，文件名会作为来源名称
        </span>
      </button>
    </>
  )
}

function PastePanel({
  busy,
  onImport,
}: {
  busy: boolean
  onImport: (text: string, source: string, format: PasteFormat) => Promise<boolean>
}) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const format = text.trim() ? detectPasteFormat(text) : null
  const preview = text.trim() ? parseImportText(text) : null

  const submit = async () => {
    if (!format || !source.trim()) return
    const ok = await onImport(text, source.trim(), format)
    if (ok) setText('')
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="来源名称" htmlFor="import-source" hint="用于在题库中筛选和整体删除">
        <Input
          id="import-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="例如：字节面经、我的整理"
          className="text-sm"
        />
      </Field>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="import-text" className="text-sm font-medium text-fg">
            题目内容
          </label>
          {format ? (
            <span className="flex items-center gap-2 text-xs text-fg-subtle">
              <Tag variant="soft">{format === 'json' ? 'JSON' : 'Markdown'}</Tag>
              {preview?.ok
                ? preview.count !== null
                  ? `识别到 ${preview.count} 道题`
                  : '格式正确'
                : null}
            </span>
          ) : null}
        </div>
        <Textarea
          id="import-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'粘贴 JSON 数组，或 AI 生成的 Markdown（每题以 ## 开头，用 --- 分隔）'}
          rows={12}
          spellCheck={false}
          className="font-mono text-xs leading-relaxed"
        />
        {preview && !preview.ok ? (
          <p className="flex items-start gap-1.5 text-xs text-danger">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            {preview.errors[0]}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button
          variant="primary"
          loading={busy}
          disabled={!preview?.ok || !source.trim()}
          onClick={submit}
        >
          <Upload />
          导入
        </Button>
      </div>
    </div>
  )
}

// ─── Results ────────────────────────────────────────────────────────────────────

function ResultCard({ result, onDismiss }: { result: CustomImportResult; onDismiss: () => void }) {
  const success = result.loaded > 0
  const Icon = success ? CircleCheck : CircleAlert
  return (
    <Box className="overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', success ? 'text-success' : 'text-danger')} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">
            {success ? `成功导入 ${result.loaded} 道题` : '导入失败，没有有效题目'}
          </p>
          <p className="truncate text-xs text-fg-subtle">来源：{result.source}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="关闭" onClick={onDismiss}>
          <X />
        </Button>
      </div>
      {result.warnings.length > 0 ? (
        <IssueList
          tone="warning"
          title={`${result.warnings.length} 条提醒`}
          items={result.warnings}
        />
      ) : null}
      {result.errors.length > 0 ? (
        <IssueList
          tone="danger"
          title={`${result.errors.length} 条题目无效`}
          items={result.errors.map((e) =>
            e.index >= 0 ? `第 ${e.index + 1} 题：${e.message}` : e.message,
          )}
        />
      ) : null}
    </Box>
  )
}

function IssueList({
  tone,
  title,
  items,
}: {
  tone: 'warning' | 'danger'
  title: string
  items: string[]
}) {
  return (
    <details className="group border-t border-line" open={items.length <= 3}>
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-1.5 px-4 py-2 text-xs font-medium select-none',
          tone === 'warning' ? 'text-warning' : 'text-danger',
        )}
      >
        <TriangleAlert className="size-3.5" />
        {title}
        <span className="ml-auto text-fg-subtle group-open:hidden">展开</span>
      </summary>
      <ul className="max-h-48 overflow-y-auto px-4 pb-3 text-xs leading-relaxed text-fg-muted">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: messages may repeat
          <li key={i} className="py-0.5">
            {item}
          </li>
        ))}
      </ul>
    </details>
  )
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────

function BuiltinLibrary({ count, onLoaded }: { count: number | null; onLoaded: () => void }) {
  const [loading, setLoading] = useState(false)
  const hasBuiltin = Boolean(count && count > 0)

  const load = async () => {
    setLoading(true)
    try {
      const results = await loadAllBuiltinModulesParallel(hasBuiltin)
      const loaded = results.reduce((sum, r) => sum + r.loaded, 0)
      const failed = results.filter((r) => r.loaded === 0 && r.errors.some((e) => e.index === -1))
      invalidateQuestionsCache()
      onLoaded()
      if (failed.length > 0) {
        toast.error(`有 ${failed.length} 个内置题库文件加载失败`, {
          description: '请检查网络后重试。',
        })
      } else {
        toast.success(
          `${hasBuiltin ? '已重新加载' : '已加载'}内置题库，共 ${loaded.toLocaleString()} 道题`,
        )
      }
    } catch (err) {
      toast.error('内置题库加载失败', {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box padding="md" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-subtle text-fg-muted">
          <Database className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">内置题库</h2>
          <p className="text-xs text-fg-subtle">版本 {BUILTIN_QUESTIONS_VERSION}</p>
        </div>
      </div>
      <p className="text-sm text-fg-muted">
        {count === null
          ? '正在读取本地题库…'
          : `本地已有 ${count.toLocaleString()} 道内置题，来自 ${BUILTIN_MODULE_FILES.length} 个题库文件。`}
      </p>
      <Button
        variant={hasBuiltin ? 'secondary' : 'primary'}
        size="sm"
        loading={loading}
        onClick={load}
      >
        <RefreshCw />
        {hasBuiltin ? '重新加载内置题库' : '加载内置题库'}
      </Button>
    </Box>
  )
}

function SourcesList({
  sources,
  counts,
  onRemove,
}: {
  sources: string[]
  counts: Record<string, number>
  onRemove: (source: string) => Promise<void>
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const confirm = async () => {
    if (!pending) return
    setRemoving(true)
    try {
      await onRemove(pending)
      setPending(null)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Box>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">自定义来源</h2>
        <span className="text-xs text-fg-subtle tabular-nums">{sources.length}</span>
      </div>
      {sources.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-subtle">导入题目后会在这里显示</p>
      ) : (
        <ul className="flex flex-col gap-0.5 p-1.5">
          {sources.map((source) => (
            <li
              key={source}
              className="group flex items-center gap-2 rounded-lg py-1.5 pr-1 pl-2.5 hover:bg-subtle"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{source}</span>
              <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                {counts[source] ?? 0} 题
              </span>
              <Button
                variant="danger-ghost"
                size="icon-sm"
                aria-label={`删除来源 ${source}`}
                onClick={() => setPending(source)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent
          size="sm"
          title="删除这个来源？"
          description={
            pending
              ? `将删除「${pending}」的 ${counts[pending] ?? 0} 道题，相关的学习记录不会再显示。此操作不可撤销。`
              : undefined
          }
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary" size="sm">
                  取消
                </Button>
              </DialogClose>
              <Button variant="danger" size="sm" loading={removing} onClick={confirm}>
                删除
              </Button>
            </>
          }
        />
      </Dialog>
    </Box>
  )
}

function CategoriesList({ categories }: { categories: CategoryEntry[] }) {
  if (categories.length === 0) return null
  return (
    <Box>
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">分类</h2>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {categories.map((c) => (
          <li key={c.name} className="px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-fg">{c.name}</span>
              {c.builtin ? <Tag variant="outline">内置</Tag> : <Tag variant="accent">自定义</Tag>}
              <span className="ml-auto text-xs text-fg-subtle tabular-nums">
                {c.modules.length} 个模块
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{c.modules.join('、')}</p>
          </li>
        ))}
      </ul>
    </Box>
  )
}
