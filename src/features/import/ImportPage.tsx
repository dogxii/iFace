import {
  BookOpen,
  CircleAlert,
  CircleCheck,
  ClipboardPaste,
  Download,
  FileUp,
  FlaskConical,
  Play,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resolveBank } from '@/data/bank/validate'
import { useDraft } from '@/hooks/useDraft'
import {
  exportBankPackage,
  type ImportTarget,
  importQuestions,
  installLocalPackage,
  removeBank,
  restoreOfficialBank,
} from '@/lib/banks/local'
import type { ImportIssue, ImportQuestion } from '@/lib/banks/localImport'
import { type OfficialBankEntry, uninstalledOfficialBanks } from '@/lib/banks/official'
import { readDraft } from '@/lib/storage'
import { initLibraryStore, useLibraryState } from '@/store/useLibraryStore'
import type { InstalledBank } from '@/types'
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
  Select,
  Spinner,
  Tag,
  Textarea,
  toast,
} from '@/ui'
import {
  detectPasteFormat,
  isImportableFile,
  isMarkdownFile,
  type PasteFormat,
  parseImportText,
  sourceNameFromFile,
} from './importData'
import { SchemaGuide } from './SchemaGuide'

type Mode = 'file' | 'paste'

interface ImportResult {
  source: string
  bankName?: string
  added: number
  updated: number
  errors: string[]
  warnings: string[]
}

const NEW_BANK = '__new__'
const ORIGIN_LABEL: Record<InstalledBank['origin']['kind'], string> = {
  bundled: '官方',
  github: 'GitHub',
  url: '链接',
  local: '本地',
}

const issueText = (issue: ImportIssue) => `第 ${issue.index + 1} 题：${issue.message}`

function downloadJSON(fileName: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function ImportPage() {
  const navigate = useNavigate()
  // Reopen on the paste tab when there is unsent pasted content.
  const [mode, setMode] = useState<Mode>(() =>
    parsePasteDraft(readDraft(PASTE_DRAFT))?.text.trim() ? 'paste' : 'file',
  )
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [targetId, setTargetId] = useState(NEW_BANK)
  const banks = useLibraryState((s) => s.banks)
  const localBanks = banks.filter((bank) => bank.origin.kind === 'local')
  const target = localBanks.some((bank) => bank.id === targetId) ? targetId : NEW_BANK

  useEffect(() => {
    void initLibraryStore()
  }, [])

  const pushResult = (result: ImportResult) => setResults((prev) => [result, ...prev])

  /** Imports one parsed input. `name` names a new bank and the fallback module. */
  const importParsed = async (input: string, format: PasteFormat, name: string) => {
    const parsed = parseImportText(input, format, name)
    if (!parsed.ok) {
      pushResult({ source: name, added: 0, updated: 0, errors: parsed.errors, warnings: [] })
      return false
    }
    if (parsed.kind === 'package') {
      const { bank, issues } = await resolveBank(parsed.text)
      const errors = issues.filter((issue) => issue.level === 'error').map((issue) => issue.message)
      const warnings = issues
        .filter((issue) => issue.level === 'warning')
        .map((issue) => issue.message)
      if (!bank) {
        pushResult({ source: name, added: 0, updated: 0, errors, warnings })
        return false
      }
      const installed = await installLocalPackage(bank)
      pushResult({
        source: name,
        bankName: installed.name,
        added: installed.questionCount,
        updated: 0,
        errors,
        warnings,
      })
      return true
    }
    const importTarget: ImportTarget =
      target === NEW_BANK ? { kind: 'new', name } : { kind: 'existing', bankId: target }
    const outcome = await importQuestions(importTarget, parsed.questions as ImportQuestion[])
    pushResult({
      source: name,
      bankName: outcome.bankId ? outcome.bankName : undefined,
      added: outcome.added,
      updated: outcome.updated,
      errors: outcome.errors.map(issueText),
      warnings: [...parsed.skipped.map((m) => `已跳过：${m}`), ...outcome.warnings.map(issueText)],
    })
    // Further files of the same batch go into the bank this one created.
    if (target === NEW_BANK && outcome.bankId) setTargetId(outcome.bankId)
    return outcome.added + outcome.updated > 0
  }

  const run = async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true)
    try {
      return await task()
    } catch (error) {
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : String(error),
      })
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const handleFiles = (files: File[]) => {
    const usable = files.filter(isImportableFile)
    if (usable.length === 0) {
      toast.error('只支持 .json 和 .md 文件')
      return
    }
    void run(async () => {
      for (const file of usable) {
        await importParsed(
          await file.text(),
          isMarkdownFile(file) ? 'markdown' : 'json',
          sourceNameFromFile(file.name),
        )
      }
    })
  }

  const handlePaste = async (text: string, source: string, format: PasteFormat) =>
    (await run(() => importParsed(text, format, source || '粘贴的题目'))) ?? false

  const imported = results.reduce((sum, r) => sum + r.added + r.updated, 0)

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
          description="把 JSON、Markdown 或 iface-bank 题库包导入为本地题库，数据只保存在本地浏览器。"
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
                <Select
                  size="sm"
                  label="导入到"
                  prefix="导入到"
                  value={target}
                  onValueChange={setTargetId}
                  options={[
                    { value: NEW_BANK, label: '新建本地题库' },
                    ...localBanks.map((bank) => ({ value: bank.id, label: bank.name })),
                  ]}
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
            <InstalledBanks banks={banks} />
            <RemovedOfficialBanks installedCount={banks.length} />
          </aside>
        </div>
      </div>
    </>
  )
}

// ─── Inputs ─────────────────────────────────────────────────────────────────────

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
          支持多个 .json / .md 文件；iface-bank 题库包会作为独立题库安装
        </span>
      </button>
    </>
  )
}

const PASTE_DRAFT = 'import:paste'
const EMPTY_PASTE = { text: '', source: '' }

function parsePasteDraft(value: unknown): typeof EMPTY_PASTE | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  return {
    text: typeof v.text === 'string' ? v.text : '',
    source: typeof v.source === 'string' ? v.source : '',
  }
}

function PastePanel({
  busy,
  onImport,
}: {
  busy: boolean
  onImport: (text: string, source: string, format: PasteFormat) => Promise<boolean>
}) {
  const [draft, setDraft] = useDraft(PASTE_DRAFT, EMPTY_PASTE, parsePasteDraft)
  const { text, source } = draft
  const setText = (next: string) => setDraft((d) => ({ ...d, text: next }))
  const setSource = (next: string) => setDraft((d) => ({ ...d, source: next }))
  const format = text.trim() ? detectPasteFormat(text) : null
  const preview = text.trim() ? parseImportText(text, format ?? undefined, source.trim()) : null

  const submit = async () => {
    if (!format) return
    const ok = await onImport(text, source.trim(), format)
    if (ok) setDraft(EMPTY_PASTE)
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="名称"
        htmlFor="import-source"
        hint="新建题库时作为题库名；没写模块的题目也会放进同名模块"
      >
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
                ? preview.kind === 'package'
                  ? `题库包「${preview.name}」· ${preview.count} 道题`
                  : `识别到 ${preview.count} 道题`
                : null}
            </span>
          ) : null}
        </div>
        <Textarea
          id="import-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            '粘贴 JSON 题目数组、iface-bank 题库包，或 AI 生成的 Markdown（每题以 ## 开头，用 --- 分隔）'
          }
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
          disabled={!preview?.ok || (preview.kind === 'questions' && !source.trim())}
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

function ResultCard({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  const success = result.added + result.updated > 0
  const Icon = success ? CircleCheck : CircleAlert
  return (
    <Box className="overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', success ? 'text-success' : 'text-danger')} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">
            {success
              ? `导入 ${result.added} 道新题${result.updated > 0 ? `，更新 ${result.updated} 道` : ''}`
              : '导入失败，没有有效题目'}
          </p>
          <p className="truncate text-xs text-fg-subtle">
            {result.source}
            {result.bankName ? ` → ${result.bankName}` : ''}
          </p>
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
          items={result.errors}
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

function InstalledBanks({ banks }: { banks: InstalledBank[] }) {
  const [pending, setPending] = useState<InstalledBank | null>(null)
  const [removing, setRemoving] = useState(false)

  const exportBank = async (bank: InstalledBank) => {
    const pkg = await exportBankPackage(bank.id)
    if (!pkg) return
    downloadJSON(`${bank.id}.iface-bank.json`, pkg)
    toast.success(`已导出「${bank.name}」`, {
      description: '可以直接导入，或放进 GitHub 仓库分享。',
    })
  }

  const confirm = async () => {
    if (!pending) return
    setRemoving(true)
    try {
      await removeBank(pending)
      toast.success(`已移除「${pending.name}」`)
      setPending(null)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Box>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">已安装的题库</h2>
        <span className="text-xs text-fg-subtle tabular-nums">{banks.length}</span>
      </div>
      {banks.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-subtle">还没有题库</p>
      ) : (
        <ul className="flex flex-col gap-0.5 p-1.5">
          {banks.map((bank) => (
            <li
              key={bank.id}
              className="group flex items-center gap-2 rounded-lg py-1.5 pr-1 pl-2.5 hover:bg-subtle"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm text-fg">
                  <span className="truncate">{bank.name}</span>
                  <Tag variant="soft" className="shrink-0">
                    {ORIGIN_LABEL[bank.origin.kind]}
                  </Tag>
                </p>
                <p className="text-xs text-fg-subtle tabular-nums">
                  {bank.modules.length} 个模块 · {bank.questionCount} 题
                  {bank.enabled ? '' : ' · 已停用'}
                </p>
              </div>
              <div className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`导出 ${bank.name}`}
                  title="导出为题库包"
                  onClick={() => void exportBank(bank)}
                >
                  <Download />
                </Button>
                <Button
                  variant="danger-ghost"
                  size="icon-sm"
                  aria-label={`移除 ${bank.name}`}
                  onClick={() => setPending(bank)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent
          size="sm"
          title="移除这个题库？"
          description={
            pending
              ? pending.origin.kind === 'local'
                ? `将删除「${pending.name}」的 ${pending.questionCount} 道题。学习记录和笔记会保留，但不会再显示；需要时可以先导出备份。此操作不可撤销。`
                : `将移除「${pending.name}」。学习记录和笔记会保留，重新安装后恢复显示。`
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
                移除
              </Button>
            </>
          }
        />
      </Dialog>
    </Box>
  )
}

function RemovedOfficialBanks({ installedCount }: { installedCount: number }) {
  const [removed, setRemoved] = useState<OfficialBankEntry[]>([])
  const [restoring, setRestoring] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read when banks are added or removed
  useEffect(() => {
    let cancelled = false
    uninstalledOfficialBanks()
      .then((list) => !cancelled && setRemoved(list))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [installedCount])

  if (removed.length === 0) return null

  const restore = async (entry: OfficialBankEntry) => {
    setRestoring(entry.id)
    try {
      await restoreOfficialBank(entry.id)
      toast.success(`已重新安装「${entry.name}」`)
    } catch (error) {
      toast.error('安装失败', {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Box>
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">已移除的官方题库</h2>
      </div>
      <ul className="flex flex-col gap-0.5 p-1.5">
        {removed.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 rounded-lg py-1.5 pr-1 pl-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{entry.name}</span>
            <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
              {entry.questionCount} 题
            </span>
            <Button
              variant="ghost"
              size="sm"
              loading={restoring === entry.id}
              onClick={() => void restore(entry)}
            >
              {restoring === entry.id ? null : <RotateCcw />}
              安装
            </Button>
          </li>
        ))}
      </ul>
    </Box>
  )
}
