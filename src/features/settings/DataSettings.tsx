import { Download, FileJson, TriangleAlert, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import { toDateKey } from '@/lib/date'
import {
  bulkPutJdMatchReports,
  bulkPutMockInterviews,
  bulkPutQuestionAnswerAnnotations,
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutQuestions,
  bulkPutStudyRecords,
  exportAllData,
  getCategoryMap,
  getCustomSources,
  META_KEYS,
  resetDatabase,
  saveCategoryMap,
  setMeta,
} from '@/lib/db'
import { type ImportPreview, mergeCategoryMaps, parseImportPreview } from '@/lib/localBackup'
import { useAIStore } from '@/store/useAIStore'
import { useStudyStore } from '@/store/useStudyStore'
import { Box, Button, Callout, cn, Skeleton, toast } from '@/ui'
import { SettingsBody, SettingsRow, SettingsSection } from './parts'
import {
  type DataStats,
  EMPTY_DATA_STATS,
  formatBackupTime,
  loadDataStats,
  withImportImpact,
} from './settingsData'

const STAT_LABELS: { key: keyof DataStats; label: string }[] = [
  { key: 'questions', label: '题目' },
  { key: 'records', label: '学习记录' },
  { key: 'notes', label: '笔记' },
  { key: 'answerAnnotations', label: '答案标注' },
  { key: 'answerOverrides', label: '自定义答案' },
  { key: 'starred', label: '重点题' },
  { key: 'aiSessions', label: 'AI 会话' },
  { key: 'mockInterviews', label: '模拟面试' },
  { key: 'jdMatchReports', label: 'JD 诊断' },
]

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function DataSettings() {
  const { sessions, clearAllSessions, upsertSessions } = useAIStore()
  const resetAll = useStudyStore().resetAll
  const [stats, setStats] = useState<DataStats | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [confirmReset, setConfirmReset] = useState<'records' | 'all' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sessionCount = Object.keys(sessions).length

  const refreshStats = useCallback(() => {
    loadDataStats(sessionCount).then(setStats)
  }, [sessionCount])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const aiSessions = Object.values(sessions)
      downloadJson({ ...data, aiSessions }, `iface-backup-${toDateKey()}.json`)
      toast.success(
        `已导出 ${data.questions.length} 题、${data.studyRecords.length} 条记录、${data.questionNotes.length} 条笔记等全部数据`,
      )
    } catch {
      toast.error('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const handlePickFile = async (file: File) => {
    setImporting(true)
    setPreview(null)
    try {
      const parsed = parseImportPreview(file.name, await file.text())
      setPreview(await withImportImpact(parsed, sessions))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '文件解析失败')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const sourceCount = preview.customSources.length
      const categoryCount = Object.keys(preview.customCategories).length
      if (preview.questions.length > 0) {
        await bulkPutQuestions(preview.questions)
        invalidateQuestionsCache()
      }
      if (sourceCount > 0) {
        const current = await getCustomSources()
        await setMeta(META_KEYS.CUSTOM_SOURCES, [
          ...new Set([...current, ...preview.customSources]),
        ])
      }
      if (categoryCount > 0) {
        await saveCategoryMap(mergeCategoryMaps(await getCategoryMap(), preview.customCategories))
      }
      if (preview.studyRecords.length > 0) await bulkPutStudyRecords(preview.studyRecords)
      if (preview.questionNotes.length > 0) await bulkPutQuestionNotes(preview.questionNotes)
      if (preview.questionAnswerAnnotations.length > 0) {
        await bulkPutQuestionAnswerAnnotations(preview.questionAnswerAnnotations)
      }
      if (preview.questionAnswerOverrides.length > 0) {
        await bulkPutQuestionAnswerOverrides(preview.questionAnswerOverrides)
      }
      if (preview.questionFlags.length > 0) await bulkPutQuestionFlags(preview.questionFlags)
      if (preview.aiSessions.length > 0) upsertSessions(preview.aiSessions)
      if (preview.mockInterviews.length > 0) await bulkPutMockInterviews(preview.mockInterviews)
      if (preview.jdMatchReports.length > 0) await bulkPutJdMatchReports(preview.jdMatchReports)

      toast.success(
        `导入成功：${preview.questions.length} 题、${preview.studyRecords.length} 条记录、${preview.questionNotes.length} 条笔记、${sourceCount} 个来源、${categoryCount} 个分类`,
      )
      setPreview(null)
      refreshStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败，请重试')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = async () => {
    if (!confirmReset) return
    try {
      if (confirmReset === 'records') {
        await resetAll()
        toast('学习记录已清空')
      } else {
        await resetDatabase()
        await resetAll()
        clearAllSessions()
        setStats(EMPTY_DATA_STATS)
        toast('所有数据已重置')
      }
      refreshStats()
    } catch {
      toast.error('操作失败，请重试')
    } finally {
      setConfirmReset(null)
    }
  }

  const previewItems = preview
    ? [
        { label: '题目', value: preview.questions.length, impact: preview.impact.questions },
        { label: '记录', value: preview.studyRecords.length, impact: preview.impact.studyRecords },
        {
          label: '笔记',
          value: preview.questionNotes.length,
          impact: preview.impact.questionNotes,
        },
        {
          label: '标注',
          value: preview.questionAnswerAnnotations.length,
          impact: preview.impact.questionAnswerAnnotations,
        },
        {
          label: '答案',
          value: preview.questionAnswerOverrides.length,
          impact: preview.impact.questionAnswerOverrides,
        },
        {
          label: '重点',
          value: preview.questionFlags.filter((f) => f.starred).length,
          impact: preview.impact.questionFlags,
        },
        { label: 'AI', value: preview.aiSessions.length, impact: preview.impact.aiSessions },
        {
          label: '面试',
          value: preview.mockInterviews.length,
          impact: preview.impact.mockInterviews,
        },
        {
          label: '诊断',
          value: preview.jdMatchReports.length,
          impact: preview.impact.jdMatchReports,
        },
      ]
    : []

  return (
    <SettingsBody>
      <SettingsSection title="本地数据" description="所有数据都保存在这台设备的浏览器中。">
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-line">
          {STAT_LABELS.map(({ key, label }, i) => (
            <div
              key={key}
              className={cn(
                'border-line px-3.5 py-3',
                i % 3 !== 2 && 'border-r',
                i < STAT_LABELS.length - 3 && 'border-b',
              )}
            >
              <p className="text-xs text-fg-subtle">{label}</p>
              {stats ? (
                <p className="mt-0.5 text-lg font-semibold tracking-tight text-fg tabular-nums">
                  {stats[key].toLocaleString()}
                </p>
              ) : (
                <Skeleton className="mt-1.5 h-5 w-10" />
              )}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="备份与恢复">
        <div className="divide-y divide-line">
          <SettingsRow
            label="导出数据"
            description="导出为 JSON，包含题库、记录、笔记、AI 对话、模拟面试等；不含 API Key。文件可能包含简历和 JD 文本，请妥善保管。"
          >
            <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
              {exporting ? null : <Download />}
              导出 JSON
            </Button>
          </SettingsRow>
          <SettingsRow
            label="导入数据"
            description="从备份文件恢复；导入前会先预览新增和覆盖的条目。"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handlePickFile(file)
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={importing && !preview}
            >
              {importing && !preview ? null : <Upload />}
              选择文件
            </Button>
          </SettingsRow>
        </div>

        {preview ? (
          <Box className="mt-3 overflow-hidden">
            <div className="flex items-start gap-3 border-b border-line px-4 py-3">
              <FileJson className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">待导入备份</p>
                <p className="mt-0.5 text-xs break-all text-fg-subtle">
                  {preview.fileName} · 导出于 {formatBackupTime(preview.exportedAt)}
                  {preview.formatVersion ? ` · 格式 v${preview.formatVersion}` : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-line sm:grid-cols-5">
              {previewItems.map((item) => (
                <div key={item.label} className="bg-canvas px-3 py-2.5">
                  <p className="text-xs text-fg-subtle">{item.label}</p>
                  <p className="text-base font-semibold text-fg tabular-nums">
                    {item.value.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-2xs text-fg-subtle tabular-nums">
                    +{item.impact.created} · 覆盖 {item.impact.overwritten}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
              <p className="text-xs leading-relaxed text-fg-muted">
                确认后才会写入本地数据；标记为覆盖的同 ID 条目会被备份内容替换。
                {preview.customSources.length > 0 ||
                Object.keys(preview.customCategories).length > 0
                  ? ` 还会恢复 ${preview.customSources.length} 个自定义来源和 ${Object.keys(preview.customCategories).length} 个自定义分类。`
                  : ''}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmImport}
                  loading={importing}
                >
                  确认导入
                </Button>
              </div>
            </div>
          </Box>
        ) : null}
      </SettingsSection>

      <SettingsSection title="危险操作" description="以下操作不可撤销，建议先导出备份。">
        <div className="divide-y divide-line rounded-xl border border-danger/30">
          {(
            [
              {
                id: 'records',
                label: '清除学习记录',
                description: '保留题库和笔记，只删除掌握状态和复习进度',
                action: '清除记录',
              },
              {
                id: 'all',
                label: '重置全部数据',
                description: '删除题库、记录、笔记、AI 对话等这台设备上的全部数据',
                action: '重置全部',
              },
            ] as const
          ).map((item) => (
            <div key={item.id} className="px-4">
              <SettingsRow label={item.label} description={item.description}>
                {confirmReset === item.id ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmReset(null)}>
                      取消
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleReset}>
                      确认
                    </Button>
                  </>
                ) : (
                  <Button variant="danger-ghost" size="sm" onClick={() => setConfirmReset(item.id)}>
                    {item.action}
                  </Button>
                )}
              </SettingsRow>
              {confirmReset === item.id ? (
                <Callout tone="danger" icon={<TriangleAlert />} className="mb-3 py-2 text-xs">
                  再次点击「确认」后立即执行，无法撤销。
                </Callout>
              ) : null}
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsBody>
  )
}
