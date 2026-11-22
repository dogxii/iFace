import { reviewIntervalDays } from '@/store/studyLogic'
import type { StudyStatus } from '@/types'

export type MasteryKey = '1' | '2' | '3'

export interface MasteryOption {
  key: MasteryKey
  status: StudyStatus
  label: string
  short: string
  tone: 'danger' | 'warning' | 'success'
}

/** The three self-ratings after reading an answer; 1 and 2 both schedule a review tomorrow. */
export const MASTERY_OPTIONS: readonly MasteryOption[] = [
  { key: '1', status: 'review', label: '没掌握', short: '没掌握', tone: 'danger' },
  { key: '2', status: 'review', label: '大概会', short: '大概会', tone: 'warning' },
  { key: '3', status: 'mastered', label: '完全掌握', short: '掌握', tone: 'success' },
]

/** When the question comes back after picking this option. */
export function masteryHint(key: MasteryKey, reviewCount: number): string {
  if (key === '1') return '明天再练'
  if (key === '2') return '明天巩固'
  return `${reviewIntervalDays({ status: 'mastered', reviewCount }) ?? 7} 天后复习`
}

/**
 * Which option to show as selected. A rating made on this visit wins; otherwise only "mastered"
 * maps to a single option ("review" could have come from 1 or 2, so neither is highlighted).
 */
export function activeMasteryKey(
  status: StudyStatus,
  justMarked: StudyStatus | null,
  lastPressedKey: MasteryKey | null,
): MasteryKey | null {
  if (justMarked) return justMarked === 'mastered' ? '3' : (lastPressedKey ?? '1')
  return status === 'mastered' ? '3' : null
}
