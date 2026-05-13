import { useCallback, useEffect, useRef, useState } from 'react'

export function useBufferedText(initialText = '') {
  const [text, setRenderedText] = useState(initialText)
  const bufferRef = useRef(initialText)
  const frameRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    frameRef.current = null
    setRenderedText(bufferRef.current)
  }, [])

  const appendText = useCallback(
    (chunk: string) => {
      bufferRef.current += chunk
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(flush)
    },
    [flush],
  )

  const resetText = useCallback((nextText = '') => {
    bufferRef.current = nextText
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    setRenderedText(nextText)
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return { text, appendText, resetText }
}
