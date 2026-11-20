export interface ChatCompletionStreamState {
  buffer: string
  done: boolean
}

export function createChatCompletionStreamState(): ChatCompletionStreamState {
  return { buffer: '', done: false }
}

function parseDataLine(data: string): { delta: string; done: boolean } {
  if (data === '[DONE]') return { delta: '', done: true }

  try {
    const parsed = JSON.parse(data)
    const delta =
      parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? ''
    return { delta: typeof delta === 'string' ? delta : '', done: false }
  } catch {
    return { delta: '', done: false }
  }
}

function parseLine(
  state: ChatCompletionStreamState,
  rawLine: string,
  onDelta: (delta: string) => void,
): void {
  const line = rawLine.trim()
  if (!line.startsWith('data:')) return

  const { delta, done } = parseDataLine(line.slice(5).trim())
  if (delta) onDelta(delta)
  if (done) state.done = true
}

export function parseChatCompletionStreamChunk(
  state: ChatCompletionStreamState,
  chunk: string,
  onDelta: (delta: string) => void,
): boolean {
  if (state.done) return true

  state.buffer += chunk
  const lines = state.buffer.split(/\r?\n/)
  state.buffer = lines.pop() ?? ''

  for (const line of lines) {
    parseLine(state, line, onDelta)
    if (state.done) break
  }

  return state.done
}

export function flushChatCompletionStream(
  state: ChatCompletionStreamState,
  onDelta: (delta: string) => void,
): boolean {
  if (!state.done && state.buffer.trim()) {
    parseLine(state, state.buffer, onDelta)
  }
  state.buffer = ''
  return state.done
}
