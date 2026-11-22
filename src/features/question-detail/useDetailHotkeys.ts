import { useEffect, useRef } from 'react'
import type { StudyStatus } from '@/types'
import { blurActiveControl, isEditableTarget } from './answerInput'

interface Options {
  /** A modal overlay (settings, module drawer, mobile side sheet) owns the keyboard while open. */
  overlayOpen: boolean
  /** True while a status change is being saved. */
  busy: () => boolean
  answerVisible: boolean
  /** In the learning-check tab only the arrow keys navigate. */
  checkView: boolean
  toggleNote: () => void
  toggleAI: () => void
  openModule: () => void
  revealAnswer: () => void
  setStatus: (status: StudyStatus, key: '1' | '2' | '3') => void
  goPrev: () => void
  goNext: () => void
}

const plain = (e: KeyboardEvent) => !e.metaKey && !e.ctrlKey && !e.altKey

/**
 * Detail page shortcuts: N notes panel, A AI panel, L module list, Space reveal, 1/2/3 mark, ←/→ navigate.
 */
export function useDetailHotkeys(options: Options) {
  const latest = useRef(options)
  latest.current = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const o = latest.current
      if (e.repeat || isEditableTarget(e.target) || o.overlayOpen) return

      const key = e.key.toLowerCase()
      if (plain(e) && key === 'n') {
        e.preventDefault()
        o.toggleNote()
        return
      }
      if (plain(e) && key === 'a') {
        e.preventDefault()
        o.toggleAI()
        return
      }
      if (plain(e) && key === 'l') {
        e.preventDefault()
        o.openModule()
        return
      }
      if (o.busy()) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        blurActiveControl()
        if (e.key === 'ArrowRight') o.goNext()
        else o.goPrev()
        return
      }
      if (o.checkView) return

      if (e.key === ' ') {
        e.preventDefault()
        if (!o.answerVisible) o.revealAnswer()
      } else if (o.answerVisible && (e.key === '1' || e.key === '2')) {
        o.setStatus('review', e.key)
      } else if (o.answerVisible && e.key === '3') {
        o.setStatus('mastered', '3')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
