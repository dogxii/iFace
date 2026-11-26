import {
  ArrowUpCircle,
  CircleAlert,
  Download,
  ExternalLink,
  FileUp,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { REPO_URL } from '@/features/settings/about'
import {
  checkForUpdates,
  type InstallPlan,
  installRemoteBank,
  prepareInstall,
} from '@/lib/banks/install'
import { exportBankPackage, removeBank, restoreOfficialBank } from '@/lib/banks/local'
import { type OfficialBankEntry, uninstalledOfficialBanks } from '@/lib/banks/official'
import { sourceOfBank } from '@/lib/banks/remote'
import { type BankSource, describeSource, parseBankSource } from '@/lib/banks/source'
import { initLibraryStore, useLibraryState } from '@/store/useLibraryStore'
import type { InstalledBank } from '@/types'
import {
  Box,
  Breadcrumb,
  Button,
  Callout,
  Dialog,
  DialogClose,
  DialogContent,
  Field,
  Input,
  PageHeader,
  PageTitle,
  Switch,
  Tag,
  toast,
} from '@/ui'
import { bankHomepage, diffSummary, issueText, ORIGIN_LABEL, sampleQuestions } from './bankPage'

const DIFFICULTY = ['', '初级', '中级', '高级']

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function downloadJSON(fileName: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function BanksPage() {
  const banks = useLibraryState((s) => s.banks)
  const [plan, setPlan] = useState<InstallPlan | null>(null)
  const [loadingSource, setLoadingSource] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    void initLibraryStore()
  }, [])

  /** Downloads and compares a bank, then opens the install dialog. */
  const open = async (source: BankSource) => {
    const key = describeSource(source)
    setLoadingSource(key)
    try {
      setPlan(await prepareInstall(source))
      return true
    } catch (error) {
      toast.error('读取题库失败', { description: errorMessage(error) })
      return false
    } finally {
      setLoadingSource(null)
    }
  }

  const checkUpdates = async () => {
    setChecking(true)
    try {
      const updatable = await checkForUpdates({ force: true })
      if (updatable.length > 0) {
        toast.success(`${updatable.length} 个题库有更新`)
      } else {
        toast.success('已安装的题库都是最新版本')
      }
    } catch (error) {
      toast.error('检查更新失败', { description: errorMessage(error) })
    } finally {
      setChecking(false)
    }
  }

  const remoteCount = banks.filter(
    (bank) => bank.origin.kind === 'github' || bank.origin.kind === 'url',
  ).length

  return (
    <>
      <PageHeader
        title={<Breadcrumb items={[{ label: '题库管理' }]} />}
        actions={
          <>
            {remoteCount > 0 ? (
              <Button variant="ghost" size="sm" loading={checking} onClick={checkUpdates}>
                {checking ? null : <RefreshCw />}
                检查更新
              </Button>
            ) : null}
            <Button asChild variant="secondary" size="sm">
              <Link to="/import">
                <FileUp />
                导入题目
              </Link>
            </Button>
          </>
        }
      />
      <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <PageTitle
          title="题库管理"
          description="从 GitHub 或链接安装别人分享的题库，管理已安装的题库。题目和学习数据只保存在本地浏览器。"
        />

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <AddBank busy={loadingSource !== null} onSubmit={open} />
            <InstalledBanks banks={banks} loadingSource={loadingSource} onUpdate={open} />
          </div>
          <aside className="flex min-w-0 flex-col gap-5">
            <PublishGuide />
            <RemovedOfficialBanks installedCount={banks.length} />
          </aside>
        </div>
      </div>

      <InstallDialog plan={plan} onClose={() => setPlan(null)} />
    </>
  )
}

// ─── Add ────────────────────────────────────────────────────────────────────────

function AddBank({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (source: BankSource) => Promise<boolean>
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = parseBankSource(value)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(null)
    if (await onSubmit(parsed.source)) setValue('')
  }

  return (
    <Box>
      <form onSubmit={submit} className="flex flex-col gap-3 p-4">
        <Field
          label="添加题库"
          htmlFor="bank-source"
          hint="输入 GitHub 仓库（owner/repo 或仓库链接），或 iface-bank.json 的 https 链接"
        >
          <div className="flex gap-2">
            <Input
              id="bank-source"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(null)
              }}
              placeholder="例如 dogxi/go-interview"
              autoComplete="off"
              spellCheck={false}
              className="text-sm"
            />
            <Button type="submit" variant="primary" loading={busy} disabled={!value.trim()}>
              {busy ? null : <Search />}
              读取
            </Button>
          </div>
        </Field>
        {error ? (
          <p className="flex items-start gap-1.5 text-xs text-danger">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </form>
    </Box>
  )
}

// ─── Installed ──────────────────────────────────────────────────────────────────

function InstalledBanks({
  banks,
  loadingSource,
  onUpdate,
}: {
  banks: InstalledBank[]
  loadingSource: string | null
  onUpdate: (source: BankSource) => Promise<boolean>
}) {
  const setBankEnabled = useLibraryState((s) => s.setBankEnabled)
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

  const confirmRemove = async () => {
    if (!pending) return
    setRemoving(true)
    try {
      await removeBank(pending)
      toast.success(`已移除「${pending.name}」`)
      setPending(null)
    } catch (error) {
      toast.error('移除失败', { description: errorMessage(error) })
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
        <p className="px-4 py-8 text-center text-sm text-fg-subtle">还没有安装题库</p>
      ) : (
        <ul aria-label="已安装的题库" className="divide-y divide-line">
          {banks.map((bank) => {
            const source = sourceOfBank(bank)
            const homepage = bankHomepage(bank)
            const switchId = `bank-enabled-${bank.id}`
            return (
              <li key={bank.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <Switch
                  id={switchId}
                  checked={bank.enabled}
                  aria-label={`启用 ${bank.name}`}
                  onCheckedChange={(enabled) => void setBankEnabled(bank.id, enabled)}
                />
                <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={
                        bank.enabled
                          ? 'truncate text-sm font-medium text-fg'
                          : 'truncate text-sm font-medium text-fg-subtle'
                      }
                    >
                      {bank.name}
                    </span>
                    <Tag variant="soft" className="shrink-0">
                      {ORIGIN_LABEL[bank.origin.kind]}
                    </Tag>
                  </span>
                  <span className="block truncate text-xs text-fg-subtle tabular-nums">
                    v{bank.version} · {bank.modules.length} 个模块 · {bank.questionCount} 题
                    {bank.authors.length > 0 ? ` · ${bank.authors.join('、')}` : ''}
                    {bank.enabled ? '' : ' · 已停用'}
                  </span>
                </label>
                <div className="flex shrink-0 items-center gap-0.5">
                  {source && bank.latest ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={loadingSource === describeSource(source)}
                      onClick={() => void onUpdate(source)}
                    >
                      {loadingSource === describeSource(source) ? null : <ArrowUpCircle />}
                      更新到 v{bank.latest.version}
                    </Button>
                  ) : null}
                  {homepage ? (
                    <Button asChild variant="ghost" size="icon-sm">
                      <a
                        href={homepage}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`打开 ${bank.name} 的主页`}
                        title="打开主页"
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  ) : null}
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
                    title="移除"
                    onClick={() => setPending(bank)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            )
          })}
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
              <Button variant="danger" size="sm" loading={removing} onClick={confirmRemove}>
                移除
              </Button>
            </>
          }
        />
      </Dialog>
    </Box>
  )
}

// ─── Install / update dialog ────────────────────────────────────────────────────

function InstallDialog({ plan, onClose }: { plan: InstallPlan | null; onClose: () => void }) {
  const [installing, setInstalling] = useState(false)
  const bank = plan?.remote.validation.bank ?? null
  const previous = plan?.previous
  const upToDate =
    previous?.origin.kind === 'github' &&
    plan?.remote.origin.kind === 'github' &&
    previous.origin.sha === plan.remote.origin.sha

  const install = async () => {
    if (!plan) return
    setInstalling(true)
    try {
      const installed = await installRemoteBank(plan.remote)
      toast.success(previous ? `已更新「${installed.name}」` : `已安装「${installed.name}」`, {
        description: `${installed.questionCount} 道题，可以在题库和练习里看到了。`,
      })
      onClose()
    } catch (error) {
      toast.error('安装失败', { description: errorMessage(error) })
    } finally {
      setInstalling(false)
    }
  }

  const name = bank?.name ?? (plan ? describeSource(plan.remote.source) : '')

  return (
    <Dialog open={plan !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        title={previous ? `更新「${name}」` : `安装「${name}」`}
        description={plan ? describeSource(plan.remote.source) : undefined}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button
              variant="primary"
              size="sm"
              loading={installing}
              disabled={!bank || upToDate}
              onClick={install}
            >
              {upToDate ? '已是最新' : previous ? '更新' : '安装'}
            </Button>
          </>
        }
      >
        {plan ? (
          <div className="flex flex-col gap-4">
            {bank ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <Meta label="版本">
                    {previous && previous.version !== bank.version
                      ? `v${previous.version} → v${bank.version}`
                      : `v${bank.version}`}
                  </Meta>
                  <Meta label="题目">
                    {bank.questionCount} 题 · {bank.modules.length} 个模块
                  </Meta>
                  <Meta label="作者">{bank.authors.join('、') || '未填写'}</Meta>
                  <Meta label="协议">{bank.license}</Meta>
                </dl>
                {bank.description ? (
                  <p className="text-sm leading-relaxed text-fg-muted">{bank.description}</p>
                ) : null}

                {plan.diff ? (
                  <Callout
                    tone={plan.removedWithData > 0 ? 'warning' : 'neutral'}
                    title={diffSummary(plan.diff)}
                  >
                    {plan.removedWithData > 0
                      ? `移除的题目里有 ${plan.removedWithData} 道有学习记录或笔记。这些数据会保留，但题目不再显示。`
                      : '学习记录、笔记和标注都会保留。'}
                  </Callout>
                ) : (
                  <Callout tone="neutral" title="社区题库">
                    内容由作者维护，iFace 不做审核。安装后可以随时停用或移除。
                  </Callout>
                )}

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-fg-subtle">模块</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {bank.modules.map((mod) => (
                      <Tag key={mod.id} variant="soft">
                        {mod.name} · {mod.questions.length}
                      </Tag>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-fg-subtle">题目示例</h3>
                  <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                    {sampleQuestions(bank).map((item) => (
                      <li key={`${item.module}-${item.question}`} className="px-3 py-2">
                        <p className="line-clamp-2 text-sm text-fg">{item.question}</p>
                        <p className="text-xs text-fg-subtle">
                          {item.module} · {DIFFICULTY[item.difficulty]}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}

            <IssueList
              tone="danger"
              title={bank ? '会跳过的内容' : '无法安装'}
              items={plan.errors.map(issueText)}
            />
            <IssueList tone="warning" title="提醒" items={plan.warnings.map(issueText)} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="truncate text-fg">{children}</dd>
    </div>
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
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-1.5">
      <h3
        className={
          tone === 'danger'
            ? 'flex items-center gap-1.5 text-xs font-medium text-danger'
            : 'flex items-center gap-1.5 text-xs font-medium text-warning'
        }
      >
        <TriangleAlert className="size-3.5" />
        {title}（{items.length}）
      </h3>
      <ul className="max-h-40 overflow-y-auto text-xs leading-relaxed text-fg-muted">
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: messages may repeat
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────

function PublishGuide() {
  return (
    <Box>
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">分享你的题库</h2>
      </div>
      <ol className="flex list-decimal flex-col gap-1.5 py-3 pr-4 pl-8 text-sm leading-relaxed text-fg-muted">
        <li>在「导入题目」里整理好本地题库，导出为题库包</li>
        <li>新建公开 GitHub 仓库，把文件放到根目录并命名为 iface-bank.json</li>
        <li>给仓库加上 topic「iface-bank」，别人就能用 owner/repo 安装</li>
      </ol>
      <div className="border-t border-line px-4 py-2.5">
        <a
          href={`${REPO_URL}/blob/main/docs/bank-format.md`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          题库格式说明
          <ExternalLink className="size-3" />
        </a>
      </div>
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
      toast.error('安装失败', { description: errorMessage(error) })
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
