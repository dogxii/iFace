import {
  CircleAlert,
  CircleCheck,
  CloudDownload,
  CloudUpload,
  Lock,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import { deleteBackupGist, pullFromGist, pushToGist } from '@/lib/gistSync'
import { useAIStore } from '@/store/useAIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Button, Callout, cn, Spinner } from '@/ui'
import { GitHubMark, SettingsBody, SettingsRow, SettingsSection } from './parts'
import { formatSyncSummary } from './settingsData'
import { useSyncState } from './useGistSync'

const FEATURES = [
  { icon: Lock, text: '备份到私人 Gist，仅自己可见' },
  { icon: MonitorSmartphone, text: '多设备同步学习进度、笔记和自定义题库' },
  { icon: ShieldCheck, text: '只申请 gist 权限，不读写代码仓库' },
  { icon: RefreshCw, text: '登录后自动拉取上次的备份' },
]

function SyncAction({
  icon,
  title,
  description,
  busy,
  disabled,
  onClick,
}: {
  icon: ReactNode
  title: string
  description: string
  busy: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 text-left transition-colors outline-none',
        'hover:border-line-strong hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60',
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent [&_svg]:size-4">
        {busy ? <Spinner size="sm" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>
      </span>
    </button>
  )
}

export function SyncSettings() {
  const { token, user, isLoggedIn, loading, login, logout } = useAuthStore()
  const { sessions, upsertSessions } = useAIStore()
  const lastResult = useSyncState((s) => s.lastResult)
  const setLastResult = useSyncState((s) => s.setLastResult)
  const [busy, setBusy] = useState<'push' | 'pull' | 'delete' | null>(null)

  const handlePush = async () => {
    if (!token) return
    setBusy('push')
    setLastResult(null)
    try {
      const result = await pushToGist(token, Object.values(sessions))
      if (result.ok) {
        if (result.aiSessions?.length) upsertSessions(result.aiSessions)
        if (result.mergedRemoteQuestionCount) invalidateQuestionsCache()
        setLastResult({
          ok: true,
          message: formatSyncSummary('已备份', result),
          at: result.exportedAt,
        })
      } else {
        setLastResult({ ok: false, message: `备份失败：${result.error ?? '未知错误'}` })
      }
    } catch (err) {
      setLastResult({
        ok: false,
        message: `备份失败：${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setBusy(null)
    }
  }

  const handlePull = async () => {
    if (!token) return
    if (!window.confirm('确定要从云端恢复数据吗？这将覆盖本地学习记录。')) return
    setBusy('pull')
    setLastResult(null)
    try {
      const result = await pullFromGist(token, Object.values(sessions))
      if (result === null) {
        setLastResult({ ok: false, message: '云端暂无备份，请先执行「备份到云端」' })
      } else if (result.ok) {
        invalidateQuestionsCache()
        if (result.aiSessions?.length) upsertSessions(result.aiSessions)
        setLastResult({
          ok: true,
          message: formatSyncSummary('已同步', result),
          at: result.exportedAt,
        })
      } else {
        setLastResult({ ok: false, message: `恢复失败：${result.error ?? '未知错误'}` })
      }
    } catch (err) {
      setLastResult({
        ok: false,
        message: `恢复失败：${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!token) return
    if (!window.confirm('确定要删除云端备份 Gist 吗？此操作不可撤销，本地数据不受影响。')) return
    setBusy('delete')
    const result = await deleteBackupGist(token)
    setBusy(null)
    setLastResult({
      ok: result.ok,
      message: result.ok ? '云端备份已删除' : `删除失败：${result.error}`,
    })
  }

  if (!isLoggedIn || !user) {
    return (
      <SettingsBody>
        <div className="flex flex-col items-center px-2 pt-6 pb-2 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-fg text-canvas">
            <GitHubMark className="size-6" />
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight text-fg">
            用 GitHub 账号同步进度
          </h3>
          <p className="mt-1 max-w-sm text-sm text-fg-muted">
            学习进度和自定义题库会备份到你的私人 Gist，换设备、清缓存都不怕丢。
          </p>
          <Button className="mt-5" variant="primary" onClick={login} loading={loading}>
            {loading ? null : <GitHubMark />}
            {loading ? '跳转中…' : '用 GitHub 登录'}
          </Button>
        </div>
        <ul className="mx-auto mt-6 grid max-w-md gap-2.5 sm:grid-cols-2">
          {FEATURES.map((item) => (
            <li
              key={item.text}
              className="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 text-xs text-fg-muted"
            >
              <item.icon className="mt-px size-3.5 shrink-0 text-fg-subtle" />
              {item.text}
            </li>
          ))}
        </ul>
      </SettingsBody>
    )
  }

  return (
    <SettingsBody>
      <SettingsSection title="账号">
        <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
          <img src={user.avatar_url} alt="" className="size-9 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{user.name || user.login}</p>
            <p className="truncate text-xs text-fg-subtle">@{user.login}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut />
            退出
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="同步"
        description="备份会和云端较新的数据合并，不会丢失另一台设备的进度。"
      >
        {lastResult ? (
          <Callout
            tone={lastResult.ok ? 'success' : 'danger'}
            icon={lastResult.ok ? <CircleCheck /> : <CircleAlert />}
            className="mb-3 pr-2 text-xs"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p>{lastResult.message}</p>
                {lastResult.at ? (
                  <p className="mt-0.5 text-fg-subtle">
                    备份时间：{new Date(lastResult.at).toLocaleString('zh-CN')}
                  </p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-my-1 size-6"
                aria-label="关闭提示"
                onClick={() => setLastResult(null)}
              >
                <X />
              </Button>
            </div>
          </Callout>
        ) : null}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <SyncAction
            icon={<CloudUpload />}
            title={busy === 'push' ? '备份中…' : '备份到云端'}
            description="把本地进度和题库上传到 GitHub Gist"
            busy={busy === 'push'}
            disabled={busy !== null}
            onClick={handlePush}
          />
          <SyncAction
            icon={<CloudDownload />}
            title={busy === 'pull' ? '恢复中…' : '从云端恢复'}
            description="拉取最新备份并合并到本地"
            busy={busy === 'pull'}
            disabled={busy !== null}
            onClick={handlePull}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="危险操作">
        <SettingsRow label="删除云端备份" description="删除 GitHub 上的备份 Gist，本地数据不受影响">
          <Button
            variant="danger-ghost"
            size="sm"
            onClick={handleDelete}
            loading={busy === 'delete'}
            disabled={busy !== null && busy !== 'delete'}
          >
            {busy === 'delete' ? null : <Trash2 />}
            删除 Gist
          </Button>
        </SettingsRow>
      </SettingsSection>
    </SettingsBody>
  )
}
