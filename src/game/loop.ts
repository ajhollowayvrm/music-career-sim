/**
 * The daily loop — BRIEF §5. Pure reducer, no React.
 *
 * Shape: plan a week, then watch it happen a day at a time. The week is the
 * planning surface; the DAY is still the clock, exactly as §5 insists.
 *
 * Deliberately NOT here, because other sections own them:
 *   §9  gigs — `Week.commitment` is the hook they'll hang on. Unpopulated: this
 *       loop has no business inventing gigs.
 *   §12 the fail state — money moves, but going broke doesn't end anything yet.
 *   §16 events — nothing interrupts a week yet. The day-at-a-time resolution
 *       exists so that it can.
 */

import type { Character } from './character.ts'
import { makeRng, type Rng } from './rng.ts'
import { resolveDay, type DayResult } from './resolve.ts'
import type { RouteId } from './routes.ts'
import {
  DAYS_IN_WEEK,
  START_ENERGY,
  canPlayWeek,
  emptyPlan,
  type WeekPlan,
} from './week.ts'

/** Deducted every week — §12 will decide what happens when you can't pay it. */
export const COST_OF_LIVING = 200
export const STARTING_MONEY = 400
export const STARTING_MOOD = 60

/**
 * A commitment already on the calendar — a booked gig, mainly. §5 wants these
 * to create opportunity cost around them. §9 owns what actually happens; this
 * type is the seam, and stays empty until then.
 */
export interface Commitment {
  readonly dayIndex: number
  readonly label: string
}

export type LoopPhase = 'planning' | 'resolving' | 'summary'

export interface LoopState {
  readonly week: number
  readonly phase: LoopPhase
  readonly energy: number
  readonly mood: number
  readonly money: number
  readonly plan: WeekPlan
  readonly commitments: readonly Commitment[]
  /** Days resolved so far this week, in order. */
  readonly days: readonly DayResult[]
  /** Money taken by cost of living at the end of the week just played. */
  readonly lastCostOfLiving: number
  readonly rng: Rng
}

export function initialLoopState(seed: number): LoopState {
  return {
    week: 1,
    phase: 'planning',
    energy: START_ENERGY,
    mood: STARTING_MOOD,
    money: STARTING_MONEY,
    plan: emptyPlan(),
    commitments: [],
    days: [],
    lastCostOfLiving: 0,
    rng: makeRng(seed),
  }
}

export type LoopAction =
  | { type: 'setDay'; dayIndex: number; routeId: RouteId | null }
  | { type: 'clearPlan' }
  | { type: 'playWeek' }
  | { type: 'advanceDay'; character: Character }
  | { type: 'nextWeek' }

export function loopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case 'setDay': {
      if (state.phase !== 'planning') return state
      if (action.dayIndex < 0 || action.dayIndex >= DAYS_IN_WEEK) return state
      const plan = [...state.plan]
      // Tapping the route already there clears the day back to nothing.
      plan[action.dayIndex] = plan[action.dayIndex] === action.routeId ? null : action.routeId
      return { ...state, plan }
    }

    case 'clearPlan':
      return state.phase === 'planning' ? { ...state, plan: emptyPlan() } : state

    case 'playWeek':
      if (state.phase !== 'planning' || !canPlayWeek(state.plan)) return state
      return { ...state, phase: 'resolving', days: [] }

    case 'advanceDay': {
      if (state.phase !== 'resolving') return state
      const dayIndex = state.days.length
      if (dayIndex >= DAYS_IN_WEEK) return state

      // An unplanned day is a rest day — §5: some days are nothing at all.
      const routeId: RouteId = state.plan[dayIndex] ?? 'rest'

      const { result, rng } = resolveDay({
        dayIndex,
        routeId,
        energy: state.energy,
        mood: state.mood,
        character: action.character,
        rng: state.rng,
      })

      const days = [...state.days, result]
      const finished = days.length >= DAYS_IN_WEEK

      return {
        ...state,
        rng,
        days,
        energy: result.energyAfter,
        mood: result.moodAfter,
        money: state.money + result.moneyDelta,
        // Bills land at the end of the week, all at once, against income that
        // arrived in dribs — that lumpy-vs-steady squeeze is §12's whole point.
        ...(finished
          ? {
              phase: 'summary' as const,
              money: state.money + result.moneyDelta - COST_OF_LIVING,
              lastCostOfLiving: COST_OF_LIVING,
            }
          : {}),
      }
    }

    case 'nextWeek':
      if (state.phase !== 'summary') return state
      return {
        ...state,
        week: state.week + 1,
        phase: 'planning',
        plan: emptyPlan(),
        days: [],
        lastCostOfLiving: 0,
      }
  }
}

/** Money earned across the week just played. */
export const weekEarnings = (state: LoopState): number =>
  state.days.reduce((sum, d) => sum + d.moneyDelta, 0)
