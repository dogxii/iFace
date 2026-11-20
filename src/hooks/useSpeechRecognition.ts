import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'phrases-not-supported'
  | 'service-not-allowed'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternativeLike
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  readonly length: number
  item(index: number): SpeechRecognitionResultLike
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: SpeechRecognitionErrorCode
  readonly message?: string
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onend: ((event: Event) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onstart: ((event: Event) => void) | null
  abort: () => void
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string
  onFinalTranscript: (transcript: string) => void
  onInterimTranscript?: (transcript: string) => void
  onError?: (message: string) => void
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function getSpeechErrorMessage(error: SpeechRecognitionErrorCode, fallback?: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '浏览器未授权麦克风，请允许语音输入后重试'
    case 'audio-capture':
      return '没有检测到可用麦克风'
    case 'language-not-supported':
      return '当前浏览器不支持所选识别语言'
    case 'network':
      return '语音识别服务暂时不可用，请稍后重试'
    case 'no-speech':
      return '没有识别到语音，可以再试一次'
    case 'aborted':
      return ''
    default:
      return fallback || '语音识别失败，请稍后重试'
  }
}

export function useSpeechRecognition({
  lang = 'zh-CN',
  onFinalTranscript,
  onInterimTranscript,
  onError,
}: UseSpeechRecognitionOptions) {
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef(onFinalTranscript)
  const interimTranscriptRef = useRef(onInterimTranscript)
  const errorRef = useRef(onError)
  const langRef = useRef(lang)

  const supported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), [])

  useEffect(() => {
    finalTranscriptRef.current = onFinalTranscript
  }, [onFinalTranscript])

  useEffect(() => {
    interimTranscriptRef.current = onInterimTranscript
  }, [onInterimTranscript])

  useEffect(() => {
    errorRef.current = onError
  }, [onError])

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const clearInterimTranscript = useCallback(() => {
    setInterimTranscript('')
    interimTranscriptRef.current?.('')
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const abort = useCallback(() => {
    recognitionRef.current?.abort()
  }, [])

  const start = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      const message = '当前浏览器不支持语音输入'
      setError(message)
      errorRef.current?.(message)
      return
    }

    recognitionRef.current?.abort()

    const recognition = new Recognition()
    recognition.lang = langRef.current
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setError(null)
      clearInterimTranscript()
    }

    recognition.onresult = (event) => {
      let interim = ''
      const finalParts: string[] = []

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript.trim()
        if (!transcript) continue

        if (result.isFinal) {
          finalParts.push(transcript)
        } else {
          interim = `${interim}${transcript}`
        }
      }

      if (finalParts.length > 0) {
        finalTranscriptRef.current(finalParts.join(' '))
      }

      const nextInterim = interim.trim()
      setInterimTranscript(nextInterim)
      interimTranscriptRef.current?.(nextInterim)
    }

    recognition.onerror = (event) => {
      const message = getSpeechErrorMessage(event.error, event.message)
      if (!message) return
      setError(message)
      errorRef.current?.(message)
    }

    recognition.onend = () => {
      setListening(false)
      clearInterimTranscript()
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      const message = '语音识别启动失败，请稍后重试'
      setError(message)
      setListening(false)
      recognitionRef.current = null
      errorRef.current?.(message)
    }
  }, [clearInterimTranscript])

  const toggle = useCallback(() => {
    if (listening) {
      stop()
    } else {
      start()
    }
  }, [listening, start, stop])

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => abort, [abort])

  return {
    supported,
    listening,
    interimTranscript,
    error,
    start,
    stop,
    toggle,
    clearError,
  }
}
