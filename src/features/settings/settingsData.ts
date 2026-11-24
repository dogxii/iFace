import {
  getAllJdMatchReports,
  getAllMockInterviews,
  getAllQuestionAnswerAnnotations,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllQuestions,
  getAllStudyRecords,
} from '@/lib/db'
import type { SyncResult } from '@/lib/gistSync'
import type { ImportImpactItem, ImportPreview } from '@/lib/localBackup'
import type { AISession } from '@/store/useAIStore'

export interface DataStats {
  questions: number
  records: number
  notes: number
  answerAnnotations: number
  answerOverrides: number
  starred: number
  aiSessions: number
  mockInterviews: number
  jdMatchReports: number
}

export const EMPTY_DATA_STATS: DataStats = {
  questions: 0,
  records: 0,
  notes: 0,
  answerAnnotations: 0,
  answerOverrides: 0,
  starred: 0,
  aiSessions: 0,
  mockInterviews: 0,
  jdMatchReports: 0,
}

function loadAllLocalData() {
  return Promise.all([
    getAllQuestions(),
    getAllStudyRecords(),
    getAllQuestionNotes(),
    getAllQuestionAnswerAnnotations(),
    getAllQuestionAnswerOverrides(),
    getAllQuestionFlags(),
    getAllMockInterviews(),
    getAllJdMatchReports(),
  ])
}

export async function loadDataStats(aiSessionCount: number): Promise<DataStats> {
  const [questions, records, notes, annotations, overrides, flags, interviews, reports] =
    await loadAllLocalData()
  return {
    questions: questions.length,
    records: records.length,
    notes: notes.length,
    answerAnnotations: annotations.length,
    answerOverrides: overrides.length,
    starred: flags.filter((flag) => flag.starred).length,
    aiSessions: aiSessionCount,
    mockInterviews: interviews.length,
    jdMatchReports: reports.length,
  }
}

export function countImportImpact<T>(
  incoming: T[],
  existingIds: Set<string>,
  getId: (item: T) => string,
): ImportImpactItem {
  const impact = { created: 0, overwritten: 0 }
  for (const item of incoming) {
    if (existingIds.has(getId(item))) impact.overwritten++
    else impact.created++
  }
  return impact
}

/** Annotate a parsed backup with how many items it would create vs overwrite locally. */
export async function withImportImpact(
  preview: ImportPreview,
  existingAISessions: Record<string, AISession>,
): Promise<ImportPreview> {
  const [questions, records, notes, annotations, overrides, flags, interviews, reports] =
    await loadAllLocalData()
  const ids = <T>(items: T[], getId: (item: T) => string) => new Set(items.map(getId))

  return {
    ...preview,
    impact: {
      questions: countImportImpact(
        preview.questions,
        ids(questions, (q) => q.id),
        (q) => q.id,
      ),
      studyRecords: countImportImpact(
        preview.studyRecords,
        ids(records, (r) => r.questionId),
        (r) => r.questionId,
      ),
      questionNotes: countImportImpact(
        preview.questionNotes,
        ids(notes, (n) => n.questionId),
        (n) => n.questionId,
      ),
      questionAnswerAnnotations: countImportImpact(
        preview.questionAnswerAnnotations,
        ids(annotations, (a) => a.id),
        (a) => a.id,
      ),
      questionAnswerOverrides: countImportImpact(
        preview.questionAnswerOverrides,
        ids(overrides, (o) => o.questionId),
        (o) => o.questionId,
      ),
      questionFlags: countImportImpact(
        preview.questionFlags,
        ids(flags, (f) => f.questionId),
        (f) => f.questionId,
      ),
      aiSessions: countImportImpact(
        preview.aiSessions,
        new Set(Object.keys(existingAISessions)),
        (s) => s.questionId,
      ),
      mockInterviews: countImportImpact(
        preview.mockInterviews,
        ids(interviews, (s) => s.id),
        (s) => s.id,
      ),
      jdMatchReports: countImportImpact(
        preview.jdMatchReports,
        ids(reports, (r) => r.id),
        (r) => r.id,
      ),
    },
  }
}

export function formatBackupTime(value?: string): string {
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

export function formatRemoteMergeSummary(result: SyncResult): string {
  const parts = [
    [result.mergedRemoteRecordCount, '条学习记录'],
    [result.mergedRemoteNoteCount, '条笔记'],
    [result.mergedRemoteAnswerAnnotationCount, '个答案标注'],
    [result.mergedRemoteQuestionFlagCount, '个重点标记'],
    [result.mergedRemoteAISessionCount, '个 AI 会话'],
    [result.mergedRemoteQuestionCount, '道自定义题'],
    [result.mergedRemoteSourceCount, '个来源'],
    [result.mergedRemoteCategoryCount, '个分类'],
  ]
    .filter(([count]) => Boolean(count))
    .map(([count, unit]) => `${(count as number).toLocaleString()} ${unit}`)

  return parts.length > 0 ? `，并保留云端较新的 ${parts.join('、')}` : ''
}

/** "已备份 3 条学习记录、…" style summary for a successful push or pull. */
export function formatSyncSummary(verb: string, result: SyncResult): string {
  return `${verb} ${result.recordCount ?? 0} 条学习记录、${result.questionCount ?? 0} 道自定义题目、${result.noteCount ?? 0} 条笔记、${result.answerAnnotationCount ?? 0} 个答案标注、${result.questionFlagCount ?? 0} 个重点题、${result.aiSessionCount ?? 0} 个 AI 会话${formatRemoteMergeSummary(result)}`
}
