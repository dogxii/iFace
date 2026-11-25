// COMPAT: remove after 2027-06-30
/**
 * Upgrades pre-2.0 backup files and Gist payloads: imported questions become local bank
 * snapshots and every reference moves to the new question ids. The result has the same shape
 * as 2.0 data, so the normal import and merge code takes it from there.
 */
import { type BankSnapshot, resolvedToPackage } from '@/lib/banks/package'
import type { AISession } from '@/store/useAIStore'
import type {
  MockInterviewSession,
  QuestionAnswerAnnotation,
  QuestionAnswerOverride,
  QuestionFlag,
  QuestionNote,
  StudyRecord,
} from '@/types'
import {
  type LegacyQuestion,
  newerByField,
  planLegacyMigration,
  remapByQuestionId,
  remapIdList,
  remapQuestionRefs,
} from './plan'

export interface LegacyDataSet {
  /** Pre-2.0 question objects (official and imported); official ones are only mapped. */
  questions: unknown[]
  studyRecords: StudyRecord[]
  questionNotes: QuestionNote[]
  questionAnswerAnnotations: QuestionAnswerAnnotation[]
  questionAnswerOverrides: QuestionAnswerOverride[]
  questionFlags: QuestionFlag[]
  aiSessions: AISession[]
  mockInterviews: MockInterviewSession[]
}

export interface UpgradedDataSet extends Omit<LegacyDataSet, 'questions'> {
  banks: BankSnapshot[]
}

export function isLegacyQuestion(value: unknown): value is LegacyQuestion {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.module === 'string' &&
    (v.difficulty === 1 || v.difficulty === 2 || v.difficulty === 3) &&
    typeof v.question === 'string' &&
    typeof v.answer === 'string' &&
    (v.tags === undefined || (Array.isArray(v.tags) && v.tags.every((t) => typeof t === 'string')))
  )
}

/** Pre-2.0 data uses ids without a bank prefix (`js-001`, `custom_<source>_<id>`). */
export function hasLegacyIds(data: Pick<LegacyDataSet, 'questions' | 'studyRecords'>): boolean {
  return (
    data.questions.some((q) => isLegacyQuestion(q) && !q.id.includes(':')) ||
    data.studyRecords.some((record) => !record.questionId.includes(':'))
  )
}

export function upgradeLegacyData(
  data: LegacyDataSet,
  officialKeys: ReadonlyMap<string, string>,
  now = Date.now(),
): UpgradedDataSet {
  const plan = planLegacyMigration({
    questions: data.questions.filter(isLegacyQuestion),
    officialKeys,
  })
  const idMap = plan.idMap
  const byUpdated = newerByField('updatedAt')

  return {
    banks: plan.localBanks.map((local, index) => ({
      id: local.id,
      enabled: true,
      order: 1000 + index,
      installedAt: now,
      updatedAt: now,
      package: resolvedToPackage(local.bank),
    })),
    studyRecords: remapByQuestionId(data.studyRecords, idMap, newerByField('lastUpdated')),
    questionNotes: remapByQuestionId(data.questionNotes, idMap, byUpdated),
    questionAnswerAnnotations: remapQuestionRefs(data.questionAnswerAnnotations, idMap),
    questionAnswerOverrides: remapByQuestionId(data.questionAnswerOverrides, idMap, byUpdated),
    questionFlags: remapByQuestionId(data.questionFlags, idMap, byUpdated),
    aiSessions: remapByQuestionId(data.aiSessions, idMap, byUpdated),
    mockInterviews: data.mockInterviews.map((session) =>
      session.report?.recommendedQuestionIds.length
        ? {
            ...session,
            report: {
              ...session.report,
              recommendedQuestionIds: remapIdList(session.report.recommendedQuestionIds, idMap),
            },
          }
        : session,
    ),
  }
}
