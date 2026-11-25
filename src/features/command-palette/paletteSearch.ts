import type { Question } from '@/types'

export interface PaletteCommand {
  id: string
  label: string
  /** Extra words that should match, e.g. pinyin initials or English names. */
  keywords?: string[]
}

/** Lower score = better match; null = no match. */
function matchScore(haystack: string, needle: string): number | null {
  const index = haystack.toLowerCase().indexOf(needle)
  if (index === -1) return null
  return index === 0 ? 0 : 1
}

export function filterCommands<T extends PaletteCommand>(commands: T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return commands
  return commands
    .map((command) => {
      const scores = [command.label, ...(command.keywords ?? [])]
        .map((text) => matchScore(text, needle))
        .filter((score): score is number => score !== null)
      return { command, score: scores.length > 0 ? Math.min(...scores) : null }
    })
    .filter((item): item is { command: T; score: number } => item.score !== null)
    .sort((a, b) => a.score - b.score)
    .map((item) => item.command)
}

/**
 * Rank questions for the palette: exact id first, then title prefix, title substring,
 * tag, module. Every whitespace-separated term must match somewhere.
 */
export function searchQuestions(questions: Question[], query: string, limit = 8): Question[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const scored: { question: Question; score: number }[] = []
  for (const question of questions) {
    const title = question.question.toLowerCase()
    const id = question.id.toLowerCase()
    const localId = id.slice(id.indexOf(':') + 1)
    const tags = question.tags.map((tag) => tag.toLowerCase())
    const module = question.module.toLowerCase()

    let score = 0
    let matchedAll = true
    for (const term of terms) {
      if (id === term || localId === term) score += 0
      else if (title.startsWith(term)) score += 1
      else if (title.includes(term)) score += 2
      else if (tags.some((tag) => tag.includes(term))) score += 3
      else if (module.includes(term) || id.includes(term)) score += 4
      else {
        matchedAll = false
        break
      }
    }
    if (matchedAll) scored.push({ question, score })
  }

  return scored
    .sort((a, b) => a.score - b.score || a.question.question.length - b.question.question.length)
    .slice(0, limit)
    .map((item) => item.question)
}
