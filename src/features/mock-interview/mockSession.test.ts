import { describe, expect, it } from 'vitest'
import type { MockInterviewSession, MockInterviewTurn } from '@/types'
import {
  cleanDimensionComment,
  currentQuestion,
  DEFAULT_FORM,
  formFromSession,
  parseAnswerDraft,
  parseSetupDraft,
  scoreTone,
  sessionProgress,
  sortSessions,
} from './mockSession'

let n = 0
function turn(role: MockInterviewTurn['role'], kind: MockInterviewTurn['kind']): MockInterviewTurn {
  n += 1
  return { id: `t${n}`, role, kind, content: `${role}-${kind}-${n}`, createdAt: n }
}

const session = {
  id: 's',
  title: 't',
  roleTitle: '前端',
  level: 'mid',
  interviewType: 'technical',
  durationMinutes: 30,
  targetQuestionCount: 6,
  jdText: 'jd',
  resumeText: 'cv',
  resumeFileName: 'cv.pdf',
  status: 'interviewing',
  questionIndex: 2,
  followUpDepth: 0,
  createdAt: 1,
  updatedAt: 1,
  turns: [
    turn('interviewer', 'question'),
    turn('candidate', 'answer'),
    turn('interviewer', 'follow_up'),
    turn('candidate', 'answer'),
    turn('interviewer', 'question'),
    turn('interviewer', 'clarification'),
  ],
} satisfies MockInterviewSession

describe('mock interview session helpers', () => {
  it('counts answers, questions and main questions', () => {
    expect(sessionProgress(session)).toEqual({ answers: 2, asked: 3, mainQuestions: 2, target: 6 })
  })

  it('finds the current interviewer prompt, skipping the closing line', () => {
    expect(currentQuestion(session)?.kind).toBe('clarification')
    const closed = { ...session, turns: [...session.turns, turn('interviewer', 'closing')] }
    expect(currentQuestion(closed)?.kind).toBe('clarification')
    expect(currentQuestion({ ...session, turns: [] })).toBeNull()
  })

  it('maps scores to tones', () => {
    expect(scoreTone(85)).toBe('success')
    expect(scoreTone(60)).toBe('warning')
    expect(scoreTone(59)).toBe('danger')
  })

  it('strips markdown emphasis from dimension comments', () => {
    expect(cleanDimensionComment(' **表达清晰** `ok` ')).toBe('表达清晰 ok')
  })

  it('restores the setup form and sorts by recency', () => {
    expect(formFromSession(session)).toMatchObject({ roleTitle: '前端', resumeFileName: 'cv.pdf' })
    const older = { ...session, id: 'old', updatedAt: 0 }
    const newer = { ...session, id: 'new', updatedAt: 5 }
    expect(sortSessions([older, newer]).map((s) => s.id)).toEqual(['new', 'old'])
  })
})

describe('parseSetupDraft', () => {
  it('restores saved fields and falls back for invalid ones', () => {
    expect(
      parseSetupDraft({
        roleTitle: 'Go 工程师',
        level: 'senior',
        durationMinutes: 7,
        jdText: 'JD',
      }),
    ).toEqual({ ...DEFAULT_FORM, roleTitle: 'Go 工程师', level: 'senior', jdText: 'JD' })
    expect(parseSetupDraft(null)).toBeNull()
  })

  it('ties an answer draft to its session', () => {
    expect(parseAnswerDraft({ sessionId: 's1', text: '我的回答' })).toEqual({
      sessionId: 's1',
      text: '我的回答',
    })
    expect(parseAnswerDraft({ text: 'x' })).toBeNull()
  })
})
