import { useCallback, useEffect, useRef, useState } from 'react'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import {
  bulkPutJdMatchReports,
  bulkPutMockInterviews,
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutQuestions,
  bulkPutStudyRecords,
  type CategoryMap,
  DEFAULT_CATEGORY_MAP,
  exportAllData,
  getAllJdMatchReports,
  getAllMockInterviews,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllQuestions,
  getAllStudyRecords,
  getCategoryMap,
  getCustomSources,
  META_KEYS,
  resetDatabase,
  saveCategoryMap,
  setMeta,
} from '@/lib/db'
import type { SyncResult } from '@/lib/gistSync'
import { deleteBackupGist, pullFromGist, pushToGist } from '@/lib/gistSync'
import {
  countMergedAISessions,
  type ImportImpactItem,
  type ImportPreview,
  mergeCategoryMaps,
  parseImportPreview,
} from '@/lib/localBackup'
import { BUILTIN_CATEGORIES } from '@/lib/questionLoader'
import {
  AI_PROVIDER_PRESETS,
  type AIConfig,
  type AIProviderId,
  type AISession,
  buildChatCompletionsUrl,
  DEFAULT_AI_CONFIG,
  DEFAULT_SYSTEM_PROMPT,
  getAIProviderPreset,
  useAIStore,
} from '@/store/useAIStore'
import { useAuthStore } from '@/store/useAuthStore'
import {
  DAILY_GOAL_DEFAULT,
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  type StudyMode,
  useStudyStore,
} from '@/store/useStudyStore'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconAI() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <circle cx="7.5" cy="14.5" r="1.5" />
      <circle cx="16.5" cy="14.5" r="1.5" />
    </svg>
  )
}

function IconData() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function IconGitHub() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconDownload() {
  return (
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
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconUpload() {
  return (
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
  )
}

function IconTrash() {
  return (
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconEye() {
  return (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
    </div>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: description ? 2 : 0,
          }}
        >
          {label}
        </p>
        {description && (
          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{description}</p>
        )}
      </div>
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 99,
          background: checked ? 'var(--primary)' : 'var(--border)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </button>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</div>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  )
}

// ─── API Key Input ────────────────────────────────────────────────────────────

function ApiKeyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'sk-...'}
        className="input-base"
        style={{ paddingRight: 36, fontFamily: value && !show ? 'var(--font-mono)' : undefined }}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'var(--text-3)',
          cursor: 'pointer',
          display: 'flex',
          padding: 2,
        }}
        tabIndex={-1}
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const colors = {
    success: { bg: 'var(--success)', text: 'white' },
    error: { bg: 'var(--danger)', text: 'white' },
    info: { bg: 'var(--primary)', text: 'white' },
  }
  const c = colors[type]
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: c.bg,
        color: c.text,
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: 'var(--shadow-lg)',
        animation: 'slide-up 0.2s var(--ease-out) both',
        whiteSpace: 'nowrap',
        maxWidth: '90vw',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {message}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

type Tab = 'ai' | 'study' | 'data' | 'sync'

function countImportImpact<T>(
  incoming: T[],
  existingIds: Set<string>,
  getId: (item: T) => string,
): ImportImpactItem {
  return incoming.reduce<ImportImpactItem>(
    (acc, item) => {
      if (existingIds.has(getId(item))) {
        acc.overwritten++
      } else {
        acc.created++
      }
      return acc
    },
    { created: 0, overwritten: 0 },
  )
}

async function withImportImpact(
  preview: ImportPreview,
  existingAISessions: Record<string, AISession>,
): Promise<ImportPreview> {
  const [questions, records, notes, answerOverrides, flags, mockInterviews, jdMatchReports] =
    await Promise.all([
      getAllQuestions(),
      getAllStudyRecords(),
      getAllQuestionNotes(),
      getAllQuestionAnswerOverrides(),
      getAllQuestionFlags(),
      getAllMockInterviews(),
      getAllJdMatchReports(),
    ])

  return {
    ...preview,
    impact: {
      questions: countImportImpact(
        preview.questions,
        new Set(questions.map((question) => question.id)),
        (question) => question.id,
      ),
      studyRecords: countImportImpact(
        preview.studyRecords,
        new Set(records.map((record) => record.questionId)),
        (record) => record.questionId,
      ),
      questionNotes: countImportImpact(
        preview.questionNotes,
        new Set(notes.map((note) => note.questionId)),
        (note) => note.questionId,
      ),
      questionAnswerOverrides: countImportImpact(
        preview.questionAnswerOverrides,
        new Set(answerOverrides.map((override) => override.questionId)),
        (override) => override.questionId,
      ),
      questionFlags: countImportImpact(
        preview.questionFlags,
        new Set(flags.map((flag) => flag.questionId)),
        (flag) => flag.questionId,
      ),
      aiSessions: countImportImpact(
        preview.aiSessions,
        new Set(Object.keys(existingAISessions)),
        (session) => session.questionId,
      ),
      mockInterviews: countImportImpact(
        preview.mockInterviews,
        new Set(mockInterviews.map((session) => session.id)),
        (session) => session.id,
      ),
      jdMatchReports: countImportImpact(
        preview.jdMatchReports,
        new Set(jdMatchReports.map((report) => report.id)),
        (report) => report.id,
      ),
    },
  }
}

function formatBackupTime(value?: string): string {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知'

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatRemoteMergeSummary(result: SyncResult): string {
  const parts = [
    result.mergedRemoteRecordCount
      ? `${result.mergedRemoteRecordCount.toLocaleString()} 条学习记录`
      : null,
    result.mergedRemoteNoteCount ? `${result.mergedRemoteNoteCount.toLocaleString()} 条笔记` : null,
    result.mergedRemoteQuestionFlagCount
      ? `${result.mergedRemoteQuestionFlagCount.toLocaleString()} 个重点标记`
      : null,
    result.mergedRemoteAISessionCount
      ? `${result.mergedRemoteAISessionCount.toLocaleString()} 个 AI 会话`
      : null,
    result.mergedRemoteQuestionCount
      ? `${result.mergedRemoteQuestionCount.toLocaleString()} 道自定义题`
      : null,
    result.mergedRemoteSourceCount
      ? `${result.mergedRemoteSourceCount.toLocaleString()} 个来源`
      : null,
    result.mergedRemoteCategoryCount
      ? `${result.mergedRemoteCategoryCount.toLocaleString()} 个分类`
      : null,
  ].filter(Boolean)

  return parts.length > 0 ? `，并保留云端较新的 ${parts.join('、')}` : ''
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { config, sessions, updateConfig, resetConfig, clearAllSessions, upsertSessions } =
    useAIStore()
  const {
    resetAll,
    studyMode,
    setStudyMode,
    streak,
    resetStreak,
    dailyGoal,
    setDailyGoal,
    hiddenCategories,
    toggleCategoryVisibility,
  } = useStudyStore()
  const { token, user, isLoggedIn, loading: authLoading, login, logout } = useAuthStore()

  const [tab, setTab] = useState<Tab>('ai')
  const [localConfig, setLocalConfig] = useState<AIConfig>({ ...config })
  const [customModel, setCustomModel] = useState('')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)
  const [confirmReset, setConfirmReset] = useState<'records' | 'all' | null>(null)
  const [dataStats, setDataStats] = useState<{
    questions: number
    records: number
    notes: number
    answerOverrides: number
    starred: number
    aiSessions: number
    mockInterviews: number
    jdMatchReports: number
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [exporting, setExporting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [syncPushing, setSyncPushing] = useState(false)
  const [syncPulling, setSyncPulling] = useState(false)
  const [syncDeleting, setSyncDeleting] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<{
    ok: boolean
    message: string
    at?: string
  } | null>(null)
  const [autoSynced, setAutoSynced] = useState(false)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  const importRef = useRef<HTMLInputElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  // Load category map when drawer opens (needed for visibility toggles)
  useEffect(() => {
    if (open) {
      getCategoryMap().then(setCategoryMap)
    }
  }, [open])

  // Sync local config when store changes or drawer opens
  useEffect(() => {
    if (open) {
      setLocalConfig({ ...config })
      setIsDirty(false)
      setSaved(false)
    }
  }, [open, config])

  // Load data stats when data tab is open
  useEffect(() => {
    if (open && tab === 'data') {
      Promise.all([
        getAllQuestions(),
        getAllStudyRecords(),
        getAllQuestionNotes(),
        getAllQuestionAnswerOverrides(),
        getAllQuestionFlags(),
        getAllMockInterviews(),
        getAllJdMatchReports(),
      ]).then(
        ([questions, records, notes, answerOverrides, flags, mockInterviews, jdMatchReports]) => {
          setDataStats({
            questions: questions.length,
            records: records.length,
            notes: notes.length,
            answerOverrides: answerOverrides.length,
            starred: flags.filter((flag) => flag.starred).length,
            aiSessions: Object.keys(sessions).length,
            mockInterviews: mockInterviews.length,
            jdMatchReports: jdMatchReports.length,
          })
        },
      )
    }
  }, [open, sessions, tab])

  // Auto-pull from Gist once per session after login.
  // We set autoSynced AFTER the call resolves so a transient failure doesn't
  // permanently suppress the sync for the rest of the session.
  useEffect(() => {
    if (!isLoggedIn || !token || autoSynced) return

    ;(async () => {
      setAutoSynced(true) // prevent concurrent calls, but errors still show
      try {
        const result = await pullFromGist(token, Object.values(sessions))
        if (result === null) return // no backup exists yet — silent is fine
        if (result.ok) {
          invalidateQuestionsCache()
          if (result.aiSessions?.length) {
            upsertSessions(result.aiSessions)
          }
          setLastSyncResult({
            ok: true,
            message: `已自动同步 ${result.recordCount ?? 0} 条学习记录、${result.questionCount ?? 0} 道自定义题目、${result.noteCount ?? 0} 条笔记、${result.questionFlagCount ?? 0} 个重点题、${result.aiSessionCount ?? 0} 个 AI 会话${formatRemoteMergeSummary(result)}`,
            at: result.exportedAt,
          })
        } else {
          // Sync failed — show the error so the user knows
          setLastSyncResult({
            ok: false,
            message: `自动同步失败：${result.error ?? '未知错误'}`,
          })
        }
      } catch (err) {
        setLastSyncResult({
          ok: false,
          message: `自动同步失败：${err instanceof Error ? err.message : String(err)}`,
        })
      }
    })()
  }, [isLoggedIn, token, autoSynced, sessions, upsertSessions])

  // Keyboard close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const frame = window.requestAnimationFrame(() => {
      drawerRef.current?.focus({ preventScroll: true })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      const elementToRestore = lastFocusedElementRef.current
      if (elementToRestore?.isConnected) {
        elementToRestore.focus({ preventScroll: true })
      }
      lastFocusedElementRef.current = null
    }
  }, [open])

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 2800)
    },
    [],
  )

  const patch = useCallback((partial: Partial<AIConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...partial }))
    setIsDirty(true)
    setSaved(false)
  }, [])

  const resolveLocalAIConfig = useCallback(() => {
    const providerId: AIProviderId = localConfig.provider ?? 'custom'
    const provider = getAIProviderPreset(providerId)
    const isKnownModel = provider.models.some((model) => model.value === localConfig.model)
    const finalModel = isKnownModel ? localConfig.model : customModel.trim()
    const finalBaseUrl = providerId === 'custom' ? customBaseUrl.trim() : localConfig.baseUrl.trim()

    return {
      ...localConfig,
      provider: providerId,
      model: finalModel,
      baseUrl: finalBaseUrl,
    }
  }, [customBaseUrl, customModel, localConfig])

  const handleSave = useCallback(() => {
    const finalConfig = resolveLocalAIConfig()

    if (!finalConfig.model) {
      showToast('请填写模型名称', 'error')
      return
    }
    if (!finalConfig.baseUrl) {
      showToast('请填写 Base URL', 'error')
      return
    }

    updateConfig(finalConfig)
    setIsDirty(false)
    setSaved(true)
    showToast('设置已保存 ✓')
    setTimeout(() => setSaved(false), 2000)
  }, [resolveLocalAIConfig, updateConfig, showToast])

  const handleReset = useCallback(() => {
    setLocalConfig({ ...DEFAULT_AI_CONFIG })
    setCustomModel('')
    setCustomBaseUrl('')
    resetConfig()
    setIsDirty(false)
    showToast('已恢复默认设置')
  }, [resetConfig, showToast])

  const handleTest = useCallback(async () => {
    const finalConfig = resolveLocalAIConfig()
    const finalModel = finalConfig.model
    const finalBaseUrl = finalConfig.baseUrl
    const apiKey = localConfig.apiKey.trim()

    if (!apiKey) {
      setTestResult({ ok: false, message: '请先填写 API Key' })
      return
    }
    if (!finalBaseUrl) {
      setTestResult({ ok: false, message: '请先填写 Base URL' })
      return
    }
    if (!finalModel) {
      setTestResult({ ok: false, message: '请先填写模型名称' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(buildChatCompletionsUrl(finalBaseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: finalModel,
          messages: [{ role: 'user', content: 'Hi, reply with exactly: OK' }],
          max_tokens: 10,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        let errMsg = `HTTP ${response.status}`
        try {
          const errJson = JSON.parse(errText)
          errMsg = errJson?.error?.message ?? errMsg
        } catch {}
        setTestResult({ ok: false, message: errMsg })
      } else {
        const data = await response.json()
        const reply = data?.choices?.[0]?.message?.content ?? '（无内容）'
        setTestResult({ ok: true, message: `连接成功！模型回复：${reply.slice(0, 60)}` })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '网络错误'
      setTestResult({ ok: false, message: msg })
    } finally {
      setTesting(false)
    }
  }, [localConfig.apiKey, resolveLocalAIConfig])

  // ─── Data Actions ──────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const aiSessions = Object.values(sessions)
      const backup = { ...data, aiSessions }
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `iface-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast(
        `已导出 ${data.questions.length} 题、${data.studyRecords.length} 条记录、${data.questionNotes.length} 条笔记、${data.questionAnswerOverrides.length} 个自定义答案、${data.questionFlags.filter((flag) => flag.starred).length} 个重点题、${aiSessions.length} 个 AI 会话、${data.mockInterviews.length} 场模拟面试、${data.jdMatchReports.length} 份 JD 诊断`,
      )
    } catch {
      showToast('导出失败，请重试', 'error')
    } finally {
      setExporting(false)
    }
  }, [sessions, showToast])

  const handleImport = useCallback(
    async (file: File) => {
      setImporting(true)
      setImportPreview(null)
      try {
        const text = await file.text()
        const preview = parseImportPreview(file.name, text)
        setImportPreview(await withImportImpact(preview, sessions))
        showToast('已解析备份，请确认后导入', 'info')
      } catch (err) {
        const msg = err instanceof Error ? err.message : '文件解析失败'
        showToast(msg, 'error')
      } finally {
        setImporting(false)
        if (importRef.current) importRef.current.value = ''
      }
    },
    [sessions, showToast],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview) return

    setImporting(true)
    try {
      const qCount = importPreview.questions.length
      const rCount = importPreview.studyRecords.length
      const nCount = importPreview.questionNotes.length
      const answerOverrideCount = importPreview.questionAnswerOverrides.length
      const flagCount = importPreview.questionFlags.length
      const starredCount = importPreview.questionFlags.filter((flag) => flag.starred).length
      const aiCount = importPreview.aiSessions.length
      const mockInterviewCount = importPreview.mockInterviews.length
      const jdMatchReportCount = importPreview.jdMatchReports.length
      const sourceCount = importPreview.customSources.length
      const categoryCount = Object.keys(importPreview.customCategories).length

      if (qCount > 0) {
        await bulkPutQuestions(importPreview.questions)
        invalidateQuestionsCache()
      }

      if (sourceCount > 0) {
        const currentSources = await getCustomSources()
        await setMeta(META_KEYS.CUSTOM_SOURCES, [
          ...new Set([...currentSources, ...importPreview.customSources]),
        ])
      }

      if (categoryCount > 0) {
        const currentMap = await getCategoryMap()
        await saveCategoryMap(mergeCategoryMaps(currentMap, importPreview.customCategories))
      }

      if (rCount > 0) {
        await bulkPutStudyRecords(importPreview.studyRecords)
      }

      if (nCount > 0) {
        await bulkPutQuestionNotes(importPreview.questionNotes)
      }

      if (answerOverrideCount > 0) {
        await bulkPutQuestionAnswerOverrides(importPreview.questionAnswerOverrides)
      }

      if (flagCount > 0) {
        await bulkPutQuestionFlags(importPreview.questionFlags)
      }

      if (aiCount > 0) {
        upsertSessions(importPreview.aiSessions)
      }

      if (mockInterviewCount > 0) {
        await bulkPutMockInterviews(importPreview.mockInterviews)
      }

      if (jdMatchReportCount > 0) {
        await bulkPutJdMatchReports(importPreview.jdMatchReports)
      }

      showToast(
        `导入成功：${qCount} 题、${rCount} 条记录、${nCount} 条笔记、${answerOverrideCount} 个自定义答案、${starredCount} 个重点题、${aiCount} 个 AI 会话、${mockInterviewCount} 场模拟面试、${jdMatchReportCount} 份 JD 诊断、${sourceCount} 个来源、${categoryCount} 个分类`,
      )
      setImportPreview(null)

      const [questions, records, notes, answerOverrides, flags, mockInterviews, jdMatchReports] =
        await Promise.all([
          getAllQuestions(),
          getAllStudyRecords(),
          getAllQuestionNotes(),
          getAllQuestionAnswerOverrides(),
          getAllQuestionFlags(),
          getAllMockInterviews(),
          getAllJdMatchReports(),
        ])
      setDataStats({
        questions: questions.length,
        records: records.length,
        notes: notes.length,
        answerOverrides: answerOverrides.length,
        starred: flags.filter((flag) => flag.starred).length,
        aiSessions: countMergedAISessions(sessions, importPreview.aiSessions),
        mockInterviews: mockInterviews.length,
        jdMatchReports: jdMatchReports.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入失败，请重试'
      showToast(msg, 'error')
    } finally {
      setImporting(false)
    }
  }, [importPreview, sessions, showToast, upsertSessions])

  const handleResetConfirm = useCallback(async () => {
    if (!confirmReset) return
    try {
      if (confirmReset === 'records') {
        await resetAll()
        setDataStats((prev) => (prev ? { ...prev, records: 0 } : prev))
        showToast('学习记录已清空')
      } else {
        await resetDatabase()
        await resetAll()
        clearAllSessions()
        setDataStats({
          questions: 0,
          records: 0,
          notes: 0,
          answerOverrides: 0,
          starred: 0,
          aiSessions: 0,
          mockInterviews: 0,
          jdMatchReports: 0,
        })
        showToast('所有数据已重置')
      }
    } catch {
      showToast('操作失败，请重试', 'error')
    } finally {
      setConfirmReset(null)
    }
  }, [confirmReset, resetAll, clearAllSessions, showToast])

  // ─── Determine AI provider/model selection ────────────────────────────────

  const selectedProvider: AIProviderId = AI_PROVIDER_PRESETS.some(
    (provider) => provider.id === localConfig.provider,
  )
    ? localConfig.provider
    : 'custom'
  const selectedProviderPreset = getAIProviderPreset(selectedProvider)
  const modelOptions = selectedProviderPreset.models
  const selectedModelPreset = modelOptions.find((model) => model.value === localConfig.model)
  const selectedModel = selectedModelPreset ? localConfig.model : 'custom'
  const isCustomProvider = selectedProvider === 'custom'

  useEffect(() => {
    if (selectedModel === 'custom' && localConfig.model !== 'custom') {
      setCustomModel(localConfig.model)
    }
    if (isCustomProvider && localConfig.baseUrl !== 'custom') {
      setCustomBaseUrl(localConfig.baseUrl)
    }
  }, [isCustomProvider, localConfig.baseUrl, localConfig.model, selectedModel])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="关闭设置面板"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
          animation: 'fade-in 0.18s var(--ease-out) both',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          width: 'min(440px, 100vw)',
          height: '100%',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawer-slide-in 0.22s var(--ease-out) both',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>设置</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置面板"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="设置分类"
          style={{
            display: 'flex',
            gap: 2,
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          {(['ai', 'study', 'data', 'sync'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              ai: 'AI 助手',
              study: '刷题偏好',
              data: '数据管理',
              sync: '云同步',
            }
            const icons: Record<Tab, React.ReactNode> = {
              ai: <IconAI />,
              study: (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              ),
              data: <IconData />,
              sync: (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              ),
            }
            const active = tab === t
            const showSyncDot = t === 'sync' && isLoggedIn && !active
            return (
              <button
                type="button"
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                title={labels[t]}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--primary)' : 'var(--text-2)',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}>{icons[t]}</span>
                <span className="settings-tab-label">{labels[t]}</span>
                {showSyncDot && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--success)',
                      border: '1.5px solid var(--surface)',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <style>{`
					@media (max-width: 400px) {
						.settings-tab-label { display: none !important; }
					}
				`}</style>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* ── Study Preferences Tab ── */}
          {tab === 'study' && (
            <>
              <SectionHeader
                icon={
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                }
                title="刷题偏好"
              />

              {/* Daily Goal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                    每日目标题数
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {dailyGoal} 题 / 天
                  </span>
                </div>
                <input
                  type="range"
                  min={DAILY_GOAL_MIN}
                  max={DAILY_GOAL_MAX}
                  step={5}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {DAILY_GOAL_MIN} 题（轻松）
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {DAILY_GOAL_DEFAULT} 题（推荐）
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {DAILY_GOAL_MAX} 题（高强度）
                  </span>
                </div>
                {dailyGoal !== DAILY_GOAL_DEFAULT && (
                  <button
                    type="button"
                    onClick={() => setDailyGoal(DAILY_GOAL_DEFAULT)}
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: 11,
                      color: 'var(--primary)',
                      background: 'var(--primary-light)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    恢复默认（{DAILY_GOAL_DEFAULT} 题）
                  </button>
                )}
              </div>

              {/* Study Mode Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                  答题模式
                </div>
                {(
                  [
                    {
                      value: 'answer-first' as StudyMode,
                      label: '先答后看',
                      emoji: '✍️',
                      description: '先在作答区写下你的理解，再展开参考答案——最有助于记忆',
                    },
                    {
                      value: 'answer-alongside' as StudyMode,
                      label: '边看边记',
                      emoji: '📖',
                      description: '查看答案的同时写笔记，作答区显示在答案卡片内',
                    },
                    {
                      value: 'memory-only' as StudyMode,
                      label: '纯记忆',
                      emoji: '🧠',
                      description: '不显示作答区，直接翻答案，快速过一遍知识点',
                    },
                  ] as { value: StudyMode; label: string; emoji: string; description: string }[]
                ).map((opt) => {
                  const active = studyMode === opt.value
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => {
                        setStudyMode(opt.value)
                        showToast(`已切换至「${opt.label}」模式`)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `1px solid ${active ? 'rgba(var(--primary-rgb),0.4)' : 'var(--border-subtle)'}`,
                        background: active ? 'var(--primary-light)' : 'var(--surface-2)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          ;(e.currentTarget as HTMLElement).style.borderColor =
                            'rgba(var(--primary-rgb),0.3)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          ;(e.currentTarget as HTMLElement).style.borderColor =
                            'var(--border-subtle)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                        }
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}>
                        {opt.emoji}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: active ? 'var(--primary)' : 'var(--text)',
                            }}
                          >
                            {opt.label}
                          </span>
                          {active && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 99,
                                background: 'var(--primary)',
                                color: 'white',
                              }}
                            >
                              当前
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--text-3)',
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Streak Stats */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>🔥 连刷记录</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetStreak()
                      showToast('连刷记录已重置')
                    }}
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                      ;(e.currentTarget as HTMLElement).style.background = 'none'
                    }}
                  >
                    重置
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    {
                      label: '今日作答',
                      value: streak.todayCount,
                      suffix: '题',
                      color: 'var(--primary)',
                    },
                    {
                      label: '当前连击',
                      value: streak.currentStreak,
                      suffix: '连',
                      color: '#f59e0b',
                    },
                    {
                      label: '历史最高',
                      value: streak.bestStreak,
                      suffix: '连',
                      color: 'var(--success)',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'var(--surface)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: s.color,
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1.2,
                        }}
                      >
                        {s.value}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'var(--text-3)',
                            marginLeft: 2,
                          }}
                        >
                          {s.suffix}
                        </span>
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestone hints */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 12,
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                  🎯 成就里程碑
                </p>
                {[
                  { n: 3, emoji: '🔥', text: '3 连击 — 良好开始！' },
                  { n: 5, emoji: '⚡', text: '5 连击 — 状态上来了！' },
                  { n: 10, emoji: '🚀', text: '10 连击 — 专注模式！' },
                  { n: 20, emoji: '👑', text: '20 连击 — 王者风范！' },
                  { n: 50, emoji: '🏆', text: '50 连击 — 传说级别！' },
                ].map((m) => (
                  <div key={m.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{m.emoji}</span>
                    <span
                      style={{
                        color: streak.bestStreak >= m.n ? 'var(--success)' : 'var(--text-3)',
                      }}
                    >
                      {m.text}
                      {streak.bestStreak >= m.n && (
                        <span style={{ marginLeft: 4, fontSize: 11 }}>✓ 已达成</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Category Visibility ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'var(--text-3)', flexShrink: 0 }}
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                    题库展示
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
                  关闭的题库会从首页、题库和练习中隐藏，学习记录仍会保留。
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(() => {
                    // Merge builtin categories with any extra custom ones from categoryMap,
                    // sorted by order field so the list is stable.
                    const allCats = Object.entries(categoryMap).sort(
                      ([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99),
                    )
                    if (allCats.length === 0)
                      return <p style={{ fontSize: 12, color: 'var(--text-3)' }}>暂无题库</p>
                    return allCats.map(([key, cat]) => {
                      const isHidden = hiddenCategories.has(key)
                      // Count how many module files belong to this category
                      const builtinCat = BUILTIN_CATEGORIES.find((c) => c.category === key)
                      const moduleCount = cat.modules.length
                      const fileCount = builtinCat ? builtinCat.files.length : 0
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            const nextVisible = isHidden
                            toggleCategoryVisibility(key)
                            showToast(
                              nextVisible
                                ? `已显示「${cat.name}」题库`
                                : `已隐藏「${cat.name}」题库`,
                            )
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: `1px solid ${
                              isHidden ? 'var(--border-subtle)' : 'rgba(var(--primary-rgb),0.3)'
                            }`,
                            background: isHidden ? 'var(--surface-2)' : 'var(--primary-light)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                            width: '100%',
                          }}
                        >
                          {/* Toggle pill */}
                          <div
                            style={{
                              width: 32,
                              height: 18,
                              borderRadius: 99,
                              background: isHidden ? 'var(--border)' : 'var(--primary)',
                              position: 'relative',
                              flexShrink: 0,
                              transition: 'background 0.2s',
                            }}
                          >
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: 3,
                                left: isHidden ? 3 : 17,
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            />
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: isHidden ? 'var(--text-3)' : 'var(--primary)',
                                }}
                              >
                                {cat.name}
                              </span>
                              {cat.builtin && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: 'var(--surface-3)',
                                    color: 'var(--text-3)',
                                    fontWeight: 500,
                                  }}
                                >
                                  内置
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                              {moduleCount} 个模块
                              {fileCount > 0 && ` · ${fileCount} 个文件`}
                            </p>
                          </div>

                          {/* Status badge */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: isHidden ? 'var(--text-3)' : 'var(--primary)',
                              flexShrink: 0,
                            }}
                          >
                            {isHidden ? '已隐藏' : '显示中'}
                          </span>
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            </>
          )}

          {/* ── AI Tab ── */}
          {tab === 'ai' && (
            <>
              <SectionHeader icon={<IconAI />} title="AI 助手配置" />

              {/* Enable Toggle */}
              <Toggle
                checked={localConfig.enabled}
                onChange={(v) => patch({ enabled: v })}
                label="启用 AI 助手"
                description="在题目详情页启用 AI 辅助分析和面试指导"
              />

              {/* Provider */}
              <Field label="服务商" hint={selectedProviderPreset.note}>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const providerId = e.target.value as AIProviderId
                    const provider = getAIProviderPreset(providerId)
                    setTestResult(null)

                    if (providerId === 'custom') {
                      const nextBaseUrl = customBaseUrl || localConfig.baseUrl
                      const nextModel = customModel || localConfig.model
                      setCustomBaseUrl(nextBaseUrl)
                      setCustomModel(nextModel === 'custom' ? '' : nextModel)
                      patch({
                        provider: providerId,
                        baseUrl: nextBaseUrl,
                        model: nextModel || 'custom',
                      })
                      return
                    }

                    patch({
                      provider: providerId,
                      baseUrl: provider.baseUrl,
                      model: provider.defaultModel,
                    })
                  }}
                  className="input-base"
                  style={{ cursor: 'pointer' }}
                >
                  {AI_PROVIDER_PRESETS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* API Key */}
              <Field label="API Key" hint="密钥仅存储在本地，不会上传到任何服务器">
                <ApiKeyInput
                  value={localConfig.apiKey}
                  onChange={(v) => patch({ apiKey: v })}
                  placeholder={selectedProviderPreset.apiKeyPlaceholder}
                />
              </Field>

              {/* Model */}
              <Field label="模型">
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const v = e.target.value
                    setTestResult(null)
                    if (v === 'custom') {
                      patch({ model: customModel || 'custom' })
                    } else {
                      patch({ model: v })
                    }
                  }}
                  className="input-base"
                  style={{ cursor: 'pointer' }}
                >
                  {modelOptions.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                      {model.recommended ? '（推荐）' : ''}
                    </option>
                  ))}
                  <option value="custom">自定义模型</option>
                </select>
                {selectedModelPreset?.description && (
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                    {selectedModelPreset.description}
                  </p>
                )}
                {selectedModel === 'custom' && (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value)
                      patch({ model: e.target.value })
                    }}
                    placeholder={
                      isCustomProvider
                        ? '模型名称，如 llama-3.3-70b'
                        : `自定义 ${selectedProviderPreset.shortLabel} 模型 ID`
                    }
                    className="input-base"
                    style={{ marginTop: 6 }}
                  />
                )}
              </Field>

              {/* Base URL */}
              <Field
                label="API Base URL"
                hint={
                  isCustomProvider
                    ? '必须是 OpenAI Chat Completions 兼容接口地址'
                    : '由服务商自动填写；如需代理网关，请选择自定义兼容接口'
                }
              >
                {isCustomProvider ? (
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => {
                      setCustomBaseUrl(e.target.value)
                      patch({ baseUrl: e.target.value })
                    }}
                    placeholder="https://your-api.com/v1"
                    className="input-base"
                  />
                ) : (
                  <input
                    type="text"
                    value={localConfig.baseUrl}
                    readOnly
                    className="input-base"
                    style={{
                      color: 'var(--text-2)',
                      background: 'var(--surface-2)',
                      cursor: 'default',
                    }}
                  />
                )}
              </Field>

              {/* Advanced */}
              <details style={{ marginTop: -4 }}>
                <summary
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  高级参数
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <Field
                    label={`Temperature：${localConfig.temperature}`}
                    hint="越高越有创意，越低越保守"
                  >
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={localConfig.temperature}
                      onChange={(e) => patch({ temperature: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--primary)' }}
                    />
                  </Field>
                  <Field label="最大 Token 数" hint="控制单次回复的最大长度">
                    <input
                      type="number"
                      value={localConfig.maxTokens}
                      onChange={(e) => patch({ maxTokens: parseInt(e.target.value, 10) || 2000 })}
                      min={100}
                      max={8000}
                      step={100}
                      className="input-base"
                    />
                  </Field>
                </div>
              </details>

              {/* System Prompt */}
              <Field
                label="System Prompt"
                hint="控制 AI 的回答风格、格式和行为，修改后点击保存生效"
              >
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={localConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT}
                    onChange={(e) => patch({ systemPrompt: e.target.value })}
                    rows={8}
                    className="input-base"
                    style={{
                      resize: 'vertical',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--control-font-size)',
                      lineHeight: 1.6,
                      minHeight: 140,
                      maxHeight: 320,
                      paddingBottom: 24,
                    }}
                    placeholder="输入自定义 System Prompt..."
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-3)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {(localConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT).length} 字
                    </span>
                    <button
                      type="button"
                      onClick={() => patch({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                      style={{
                        fontSize: 10,
                        color: 'var(--primary)',
                        background: 'var(--primary-light)',
                        border: 'none',
                        borderRadius: 4,
                        padding: '2px 7px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      恢复默认
                    </button>
                  </div>
                </div>
              </Field>

              {/* Usage tip */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--primary-light)',
                  border: '1px solid rgba(var(--primary-rgb), 0.15)',
                  fontSize: 12,
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                }}
              >
                <p style={{ fontWeight: 500, color: 'var(--primary)', marginBottom: 6 }}>
                  💡 使用说明
                </p>
                <p>在题目详情页点击「AI 分析」按钮即可开始对话。</p>
                <p style={{ marginTop: 4 }}>
                  可使用快捷动作快速获取考点分析、答题结构、追问预测等辅助。
                </p>
              </div>

              {/* AI Sessions Clear */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    清除对话记录
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    删除所有 AI 对话历史（本地存储）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAllSessions()
                    showToast('对话记录已清除')
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-2)',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--danger-light)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  }}
                >
                  清除
                </button>
              </div>
            </>
          )}

          {/* ── Sync Tab ── */}
          {tab === 'sync' && (
            <>
              <SectionHeader
                icon={
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                }
                title="云同步"
              />

              {/* Not logged in */}
              {!isLoggedIn && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      padding: '20px 16px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'var(--surface-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-3)',
                      }}
                    >
                      <IconGitHub />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text)',
                          marginBottom: 4,
                        }}
                      >
                        使用 GitHub 账号同步进度
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                        学习进度和自定义题库将备份到你的 GitHub 私人 Gist，多端同步，不怕丢失
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={login}
                      disabled={authLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 20px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'var(--text)',
                        color: 'var(--surface)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: authLoading ? 'default' : 'pointer',
                        transition: 'opacity 0.15s',
                        opacity: authLoading ? 0.6 : 1,
                      }}
                    >
                      <IconGitHub />
                      {authLoading ? '跳转中…' : '用 GitHub 登录'}
                    </button>
                  </div>

                  {/* Feature list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { icon: '☁️', text: '备份到私人 Gist，仅自己可见' },
                      { icon: '📱', text: '多设备自动同步学习进度' },
                      { icon: '🔒', text: '仅申请 gist 权限，不读写代码仓库' },
                      { icon: '⚡', text: '登录后自动拉取上次备份' },
                    ].map(({ icon, text }) => (
                      <div
                        key={text}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'var(--surface-2)',
                        }}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logged in */}
              {isLoggedIn && user && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* User card */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: '2px solid var(--border)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user.name || user.login}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        @{user.login}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      style={{
                        flexShrink: 0,
                        padding: '4px 10px',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-3)',
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      }}
                    >
                      退出
                    </button>
                  </div>

                  {/* Last sync result banner */}
                  {lastSyncResult && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: lastSyncResult.ok
                          ? 'var(--success-light, rgba(16,185,129,0.08))'
                          : 'var(--danger-light, rgba(239,68,68,0.08))',
                        border: `1px solid ${lastSyncResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>
                        {lastSyncResult.ok ? '✅' : '❌'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            color: lastSyncResult.ok ? 'var(--success)' : 'var(--danger)',
                            lineHeight: 1.5,
                          }}
                        >
                          {lastSyncResult.message}
                        </p>
                        {lastSyncResult.at && (
                          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            备份时间：{new Date(lastSyncResult.at).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setLastSyncResult(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-3)',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Sync actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Push */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return
                        setSyncPushing(true)
                        setLastSyncResult(null)
                        try {
                          const result = await pushToGist(token, Object.values(sessions))
                          if (result.ok) {
                            if (result.aiSessions?.length) {
                              upsertSessions(result.aiSessions)
                            }
                            if (result.mergedRemoteQuestionCount) {
                              invalidateQuestionsCache()
                            }
                            setLastSyncResult({
                              ok: true,
                              message: `已备份 ${result.recordCount ?? 0} 条学习记录、${result.questionCount ?? 0} 道自定义题目、${result.noteCount ?? 0} 条笔记、${result.questionFlagCount ?? 0} 个重点题、${result.aiSessionCount ?? 0} 个 AI 会话${formatRemoteMergeSummary(result)}`,
                              at: result.exportedAt,
                            })
                          } else {
                            setLastSyncResult({
                              ok: false,
                              message: `备份失败：${result.error ?? '未知错误'}`,
                            })
                          }
                        } catch (err) {
                          setLastSyncResult({
                            ok: false,
                            message: `备份失败：${err instanceof Error ? err.message : String(err)}`,
                          })
                        } finally {
                          setSyncPushing(false)
                        }
                      }}
                      disabled={syncPushing || syncPulling}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        cursor: syncPushing || syncPulling ? 'default' : 'pointer',
                        opacity: syncPushing || syncPulling ? 0.6 : 1,
                        transition: 'all 0.15s',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!syncPushing && !syncPulling) {
                          ;(e.currentTarget as HTMLElement).style.borderColor =
                            'rgba(var(--primary-rgb),0.4)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--primary-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          flexShrink: 0,
                        }}
                      >
                        {syncPushing ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            style={{ animation: 'spin 1s linear infinite' }}
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        ) : (
                          <IconUpload />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                          {syncPushing ? '备份中…' : '备份到云端'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          将本地进度和题库上传到 GitHub Gist
                        </p>
                      </div>
                    </button>

                    {/* Pull */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return
                        if (!confirm('确定要从云端恢复数据吗？这将覆盖本地学习记录。')) return
                        setSyncPulling(true)
                        setLastSyncResult(null)
                        try {
                          const result = await pullFromGist(token, Object.values(sessions))
                          if (result === null) {
                            setLastSyncResult({
                              ok: false,
                              message: '云端暂无备份，请先执行「备份到云端」',
                            })
                          } else if (result.ok) {
                            invalidateQuestionsCache()
                            if (result.aiSessions?.length) {
                              upsertSessions(result.aiSessions)
                            }
                            setLastSyncResult({
                              ok: true,
                              message: `已同步 ${result.recordCount ?? 0} 条学习记录、${result.questionCount ?? 0} 道自定义题目、${result.noteCount ?? 0} 条笔记、${result.questionFlagCount ?? 0} 个重点题、${result.aiSessionCount ?? 0} 个 AI 会话${formatRemoteMergeSummary(result)}`,
                              at: result.exportedAt,
                            })
                          } else {
                            setLastSyncResult({
                              ok: false,
                              message: `恢复失败：${result.error ?? '未知错误'}`,
                            })
                          }
                        } catch (err) {
                          setLastSyncResult({
                            ok: false,
                            message: `恢复失败：${err instanceof Error ? err.message : String(err)}`,
                          })
                        } finally {
                          setSyncPulling(false)
                        }
                      }}
                      disabled={syncPushing || syncPulling}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        cursor: syncPushing || syncPulling ? 'default' : 'pointer',
                        opacity: syncPushing || syncPulling ? 0.6 : 1,
                        transition: 'all 0.15s',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!syncPushing && !syncPulling) {
                          ;(e.currentTarget as HTMLElement).style.borderColor =
                            'rgba(var(--primary-rgb),0.4)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--surface-3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-2)',
                          flexShrink: 0,
                        }}
                      >
                        {syncPulling ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            style={{ animation: 'spin 1s linear infinite' }}
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        ) : (
                          <IconDownload />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                          {syncPulling ? '恢复中…' : '从云端恢复'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          从 GitHub Gist 拉取最新备份到本地
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(239,68,68,0.15)',
                      background: 'rgba(239,68,68,0.03)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--danger, #ef4444)',
                        marginBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      危险操作
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) return
                        if (
                          !confirm('确定要删除云端备份 Gist 吗？此操作不可撤销，本地数据不受影响。')
                        )
                          return
                        setSyncDeleting(true)
                        const result = await deleteBackupGist(token)
                        setSyncDeleting(false)
                        setLastSyncResult({
                          ok: result.ok,
                          message: result.ok ? '云端备份已删除' : `删除失败：${result.error}`,
                        })
                      }}
                      disabled={syncDeleting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'transparent',
                        color: 'var(--danger, #ef4444)',
                        fontSize: 12,
                        cursor: syncDeleting ? 'default' : 'pointer',
                        opacity: syncDeleting ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!syncDeleting)
                          (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                      }}
                    >
                      <IconTrash />
                      {syncDeleting ? '删除中…' : '删除云端备份 Gist'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Data Tab ── */}
          {tab === 'data' && (
            <>
              <SectionHeader icon={<IconData />} title="数据管理" />

              {/* Stats */}
              {dataStats && (
                <div
                  className="settings-data-stats-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
                    gap: 10,
                  }}
                >
                  {[
                    { label: '题目总数', value: dataStats.questions, color: 'var(--primary)' },
                    { label: '学习记录', value: dataStats.records, color: 'var(--success)' },
                    { label: '题目笔记', value: dataStats.notes, color: 'var(--warning)' },
                    {
                      label: '自定义答案',
                      value: dataStats.answerOverrides,
                      color: 'var(--primary)',
                    },
                    { label: '重点题', value: dataStats.starred, color: '#f59e0b' },
                    { label: 'AI 会话', value: dataStats.aiSessions, color: 'var(--text-2)' },
                    { label: '模拟面试', value: dataStats.mockInterviews, color: 'var(--primary)' },
                    { label: 'JD 诊断', value: dataStats.jdMatchReports, color: 'var(--text-2)' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 10,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: stat.color,
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1,
                          marginBottom: 6,
                        }}
                      >
                        {stat.value.toLocaleString()}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Export */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                  导出数据
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  将题目库、学习记录、题目笔记、重点题、AI 对话、模拟面试和 JD 诊断导出为 JSON
                  文件；不会导出 API Key。模拟面试和 JD 诊断可能包含简历与 JD 文本，请妥善保管。
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: exporting ? 'wait' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: exporting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!exporting) {
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(var(--primary-rgb),0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  }}
                >
                  <IconDownload />
                  {exporting ? '导出中…' : '导出 JSON'}
                </button>
              </div>

              {/* Import */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                  导入数据
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  从备份文件恢复数据。已存在的题目、记录、笔记、重点标记、AI 会话、模拟面试和 JD
                  诊断将被覆盖更新。
                </p>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImport(file)
                  }}
                />
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  disabled={importing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: importing ? 'wait' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: importing ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!importing) {
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(var(--primary-rgb),0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  }}
                >
                  <IconUpload />
                  {importing ? '处理中…' : '选择文件'}
                </button>

                {importPreview && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid rgba(var(--primary-rgb),0.22)',
                      background: 'var(--primary-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--primary)',
                          marginBottom: 4,
                        }}
                      >
                        待导入备份预览
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-3)',
                          lineHeight: 1.5,
                          wordBreak: 'break-all',
                        }}
                      >
                        {importPreview.fileName} · 导出时间{' '}
                        {formatBackupTime(importPreview.exportedAt)}
                        {importPreview.formatVersion
                          ? ` · 格式 v${importPreview.formatVersion}`
                          : ''}
                      </p>
                    </div>

                    <div
                      className="settings-import-preview-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {[
                        {
                          label: '题目',
                          value: importPreview.questions.length,
                          impact: importPreview.impact.questions,
                        },
                        {
                          label: '记录',
                          value: importPreview.studyRecords.length,
                          impact: importPreview.impact.studyRecords,
                        },
                        {
                          label: '笔记',
                          value: importPreview.questionNotes.length,
                          impact: importPreview.impact.questionNotes,
                        },
                        {
                          label: '答案',
                          value: importPreview.questionAnswerOverrides.length,
                          impact: importPreview.impact.questionAnswerOverrides,
                        },
                        {
                          label: '重点',
                          value: importPreview.questionFlags.filter((flag) => flag.starred).length,
                          impact: importPreview.impact.questionFlags,
                        },
                        {
                          label: 'AI',
                          value: importPreview.aiSessions.length,
                          impact: importPreview.impact.aiSessions,
                        },
                        {
                          label: '面试',
                          value: importPreview.mockInterviews.length,
                          impact: importPreview.impact.mockInterviews,
                        },
                        {
                          label: '诊断',
                          value: importPreview.jdMatchReports.length,
                          impact: importPreview.impact.jdMatchReports,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(var(--primary-rgb),0.12)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: 'var(--text)',
                              lineHeight: 1.1,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {item.value.toLocaleString()}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                            {item.label}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
                            新增 {item.impact.created.toLocaleString()} · 覆盖{' '}
                            {item.impact.overwritten.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      确认后才会写入本地数据；标记为覆盖的同 ID 题目、学习记录、笔记、重点标记、AI
                      会话、模拟面试和 JD 诊断会被备份内容替换。
                      {importPreview.customSources.length > 0 ||
                      Object.keys(importPreview.customCategories).length > 0
                        ? ` 还会恢复 ${importPreview.customSources.length} 个自定义来源和 ${Object.keys(importPreview.customCategories).length} 个自定义分类。`
                        : ''}
                    </p>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={importing}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--primary)',
                          background: 'var(--primary)',
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: importing ? 'wait' : 'pointer',
                          opacity: importing ? 0.65 : 1,
                        }}
                      >
                        <IconCheck />
                        {importing ? '导入中…' : '确认导入'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportPreview(null)}
                        disabled={importing}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text-2)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: importing ? 'default' : 'pointer',
                          opacity: importing ? 0.65 : 1,
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Clear records */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.18)',
                  background: 'rgba(239,68,68,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    清除学习记录
                  </p>
                  <p
                    style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}
                  >
                    保留题库，仅删除进度数据
                  </p>
                </div>
                {confirmReset === 'records' ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleResetConfirm}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 7,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      确认清除
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(null)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset('records')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'var(--danger-light)',
                      color: 'var(--danger)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <IconTrash />
                    清除学习记录
                  </button>
                )}
              </div>

              {/* Reset all */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.18)',
                  background: 'rgba(239,68,68,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    重置所有数据
                  </p>
                  <p
                    style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}
                  >
                    删除题库、记录、AI 对话等全部数据
                  </p>
                </div>
                {confirmReset === 'all' ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleResetConfirm}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 7,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      确认重置
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(null)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-2)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset('all')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: '1px solid rgba(239,68,68,0.25)',
                      background: 'var(--danger-light)',
                      color: 'var(--danger)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <IconTrash />
                    重置全部数据
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          {/* Save bar (AI tab) */}
          {tab === 'ai' && (
            <div
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {/* Test result banner */}
              {testResult && (
                <div
                  style={{
                    padding: '8px 20px',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: testResult.ok ? 'var(--success)' : 'var(--danger)',
                    background: testResult.ok ? 'var(--success-light)' : 'var(--danger-light)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: 1 }}>{testResult.ok ? '✅' : '❌'}</span>
                  <span style={{ wordBreak: 'break-all' }}>{testResult.message}</span>
                </div>
              )}
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 9,
                    border: 'none',
                    background: isDirty ? 'var(--primary)' : 'var(--surface-3)',
                    color: isDirty ? 'white' : 'var(--text-3)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: isDirty ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {saved ? (
                    <>
                      <IconCheck /> 已保存
                    </>
                  ) : (
                    '保存设置'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: testing ? 'var(--text-3)' : 'var(--text-2)',
                    fontSize: 12,
                    cursor: testing ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    if (!testing) {
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                      ;(e.currentTarget as HTMLElement).style.borderColor =
                        'rgba(var(--primary-rgb), 0.4)'
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {testing ? (
                    <>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      测试中…
                    </>
                  ) : (
                    <>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      测试连接
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-3)',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  恢复默认
                </button>
              </div>
            </div>
          )}

          {/* GitHub link */}
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <a
              href="https://github.com/dogxii/iFace"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: 'var(--text-3)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
              }}
            >
              <IconGitHub />
              dogxii/iFace
            </a>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'var(--font-mono)',
              }}
            >
              v{__APP_VERSION__}
            </span>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}

      <style>{`
	        @keyframes drawer-slide-in {
	          from { transform: translateX(100%); opacity: 0.8; }
	          to { transform: translateX(0); opacity: 1; }
	        }
	        @media (max-width: 420px) {
	          .settings-data-stats-grid,
	          .settings-import-preview-grid {
	            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
	          }
	        }
	      `}</style>
    </>
  )
}
