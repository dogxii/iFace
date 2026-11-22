import type { QuestionNote } from '@/types'
import { getQuestionNote, putQuestionNote } from './db'
import { readJSON, removeKey, STORAGE_KEYS, writeJSON } from './storage'

/**
 * Crash-safe note edits. IndexedDB writes are async and are not guaranteed to finish while a
 * page unloads, so an edit still waiting for autosave is stashed synchronously in localStorage
 * on `pagehide` and written to IndexedDB on the next load if it is newer than the saved note.
 */

export function parseNoteDraft(value: unknown): QuestionNote | null {
  if (!value || typeof value !== 'object') return null
  const draft = value as Record<string, unknown>
  if (
    typeof draft.questionId !== 'string' ||
    !draft.questionId ||
    typeof draft.content !== 'string' ||
    typeof draft.createdAt !== 'number' ||
    typeof draft.updatedAt !== 'number'
  ) {
    return null
  }
  return {
    questionId: draft.questionId,
    content: draft.content,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  }
}

/** True when the stashed edit is newer than what IndexedDB holds. */
export function isDraftNewer(draft: QuestionNote, saved: QuestionNote | undefined): boolean {
  if (!saved) return draft.content.trim().length > 0
  return draft.updatedAt > saved.updatedAt && draft.content !== saved.content
}

export function stashNoteDraft(note: QuestionNote): void {
  writeJSON(STORAGE_KEYS.noteDraft, note)
}

let recovering: Promise<void> | null = null

/** Write a stashed draft back to IndexedDB if it is newer. Safe to call repeatedly. */
export function recoverNoteDraft(): Promise<void> {
  recovering ??= (async () => {
    const draft = readJSON(STORAGE_KEYS.noteDraft, parseNoteDraft, null)
    if (!draft) return
    try {
      if (isDraftNewer(draft, await getQuestionNote(draft.questionId))) {
        await putQuestionNote(draft)
      }
      removeKey(STORAGE_KEYS.noteDraft)
    } catch {
      // Keep the draft for the next attempt.
    }
  })().finally(() => {
    recovering = null
  })
  return recovering
}
