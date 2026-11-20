import { describe, expect, it } from 'vitest'
import { isLearningCheckAnswerCorrect, type LearningCheckQuestion } from './learningCheck'

const check = { answerIds: ['a', 'c'] } as LearningCheckQuestion

describe('isLearningCheckAnswerCorrect', () => {
  it('accepts the exact set in any order', () => {
    expect(isLearningCheckAnswerCorrect(check, ['c', 'a'])).toBe(true)
  })

  it('rejects partial, extra or wrong selections', () => {
    expect(isLearningCheckAnswerCorrect(check, ['a'])).toBe(false)
    expect(isLearningCheckAnswerCorrect(check, ['a', 'b', 'c'])).toBe(false)
    expect(isLearningCheckAnswerCorrect(check, ['a', 'b'])).toBe(false)
  })
})
