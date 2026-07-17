/**
 * Character creation state — a pure reducer. Imports nothing from React.
 *
 * This is the settled state architecture for the project (README): one plain
 * state object, one pure reducer, colocated with the system it serves. The UI
 * holds it with useReducer and nothing else.
 */

import { type OriginId } from './origins.ts'
import { INTERVIEW } from './interview.ts'
import { type TalentId, type TalentSpread, MAX_TALENT_AT_CREATION, POINTS_TO_SPEND, spentPoints } from './talents.ts'
import { type CharacterDraft, baseTalents } from './character.ts'

/**
 * The steps, in order. §2 puts the genre picker "right next to talent
 * allocation so the player can flip between them and try builds" — on a phone
 * there is no "next to", so they share one step ('sound') with a toggle. Same
 * intent, honest translation.
 */
export const STEPS = ['name', 'origin', 'interview', 'sound', 'confirm'] as const
export type Step = (typeof STEPS)[number]

export interface CreationState {
  readonly step: Step
  readonly realName: string
  readonly stageName: string
  readonly originId: OriginId | null
  /** Index into INTERVIEW; the interview is one question per screen. */
  readonly questionIndex: number
  readonly answers: Readonly<Record<string, string>>
  readonly talents: TalentSpread
  readonly genreIds: readonly string[]
}

export const initialCreationState: CreationState = {
  step: 'name',
  realName: '',
  stageName: '',
  originId: null,
  questionIndex: 0,
  answers: {},
  talents: {
    lyrics: 0,
    creativity: 0,
    composition: 0,
    production: 0,
    voice: 0,
    guitar: 0,
    keys: 0,
    drums: 0,
    bass: 0,
    stagePresence: 0,
  },
  genreIds: [],
}

export type CreationAction =
  | { type: 'setRealName'; value: string }
  | { type: 'setStageName'; value: string }
  | { type: 'chooseOrigin'; originId: OriginId }
  | { type: 'answer'; questionId: string; answerId: string }
  | { type: 'goToQuestion'; index: number }
  | { type: 'adjustTalent'; talentId: TalentId; delta: number }
  | { type: 'toggleGenre'; genreId: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' }

const stepIndex = (step: Step): number => STEPS.indexOf(step)

const clampStep = (i: number): Step => STEPS[Math.min(STEPS.length - 1, Math.max(0, i))] ?? 'name'

/** Points still unspent. Origin head-start doesn't count against the budget. */
export const pointsLeft = (state: CreationState): number => {
  if (!state.originId) return POINTS_TO_SPEND
  return POINTS_TO_SPEND - spentPoints(state.talents, baseTalents(state.originId))
}

export const isQuestionAnswered = (state: CreationState, index: number): boolean => {
  const q = INTERVIEW[index]
  return q ? state.answers[q.id] !== undefined : false
}

/** Whether the current step is complete enough to move on. */
export function canAdvance(state: CreationState): boolean {
  switch (state.step) {
    case 'name':
      // Stage name is optional (§2) — it can be blank and set later.
      return state.realName.trim().length > 0
    case 'origin':
      return state.originId !== null
    case 'interview':
      // Every question. This is the character; there's no skipping it.
      return INTERVIEW.every((q) => state.answers[q.id] !== undefined)
    case 'sound':
      // Spend the points, love at least one thing.
      return pointsLeft(state) === 0 && state.genreIds.length > 0
    case 'confirm':
      return true
  }
}

export function creationReducer(state: CreationState, action: CreationAction): CreationState {
  switch (action.type) {
    case 'setRealName':
      return { ...state, realName: action.value }

    case 'setStageName':
      return { ...state, stageName: action.value }

    case 'chooseOrigin': {
      // Re-seed talents from the new origin. Any points already spent are
      // returned, because a different origin is a different head-start — and
      // silently keeping a spread built on the old one would be a lie.
      return { ...state, originId: action.originId, talents: baseTalents(action.originId) }
    }

    case 'answer': {
      const answers = { ...state.answers, [action.questionId]: action.answerId }
      // Answering advances. The interview is a conversation, not a form — you
      // don't press Next after each reply.
      const isLast = state.questionIndex >= INTERVIEW.length - 1
      return {
        ...state,
        answers,
        questionIndex: isLast ? state.questionIndex : state.questionIndex + 1,
      }
    }

    case 'goToQuestion':
      return {
        ...state,
        questionIndex: Math.min(INTERVIEW.length - 1, Math.max(0, action.index)),
      }

    case 'adjustTalent': {
      if (!state.originId) return state
      const base = baseTalents(state.originId)
      const current = state.talents[action.talentId]
      const next = current + action.delta

      // Can't go below the origin's head-start — it's a gift, not a budget.
      const floor = base[action.talentId]
      if (next < floor || next > MAX_TALENT_AT_CREATION) return state
      if (action.delta > 0 && pointsLeft(state) <= 0) return state

      return { ...state, talents: { ...state.talents, [action.talentId]: next } }
    }

    case 'toggleGenre': {
      // Multi-select: every genre you actually love (§2).
      const has = state.genreIds.includes(action.genreId)
      return {
        ...state,
        genreIds: has
          ? state.genreIds.filter((g) => g !== action.genreId)
          : [...state.genreIds, action.genreId],
      }
    }

    case 'next':
      if (!canAdvance(state)) return state
      return { ...state, step: clampStep(stepIndex(state.step) + 1) }

    case 'back': {
      // Inside the interview, Back walks the questions before it leaves the step.
      if (state.step === 'interview' && state.questionIndex > 0) {
        return { ...state, questionIndex: state.questionIndex - 1 }
      }
      return { ...state, step: clampStep(stepIndex(state.step) - 1) }
    }

    case 'reset':
      return initialCreationState
  }
}

/** The draft, once it's complete enough to freeze. Null if it isn't. */
export function draftFrom(state: CreationState): CharacterDraft | null {
  if (!state.originId) return null
  return {
    realName: state.realName,
    stageName: state.stageName,
    originId: state.originId,
    answers: state.answers,
    talents: state.talents,
    genreIds: state.genreIds,
  }
}
