import type { CategoryMap } from '@/lib/db'
import type { Question } from '@/types'

export function getHiddenModules(
  categoryMap: CategoryMap,
  hiddenCategories: ReadonlySet<string>,
): Set<string> {
  const modules = new Set<string>()

  for (const [categoryName, category] of Object.entries(categoryMap)) {
    if (!hiddenCategories.has(categoryName)) continue

    for (const moduleName of category.modules) {
      modules.add(moduleName)
    }
  }

  return modules
}

export function filterVisibleQuestions<T extends Pick<Question, 'module'>>(
  questions: T[],
  hiddenModules: ReadonlySet<string>,
): T[] {
  if (hiddenModules.size === 0) return questions
  return questions.filter((question) => !hiddenModules.has(question.module))
}
