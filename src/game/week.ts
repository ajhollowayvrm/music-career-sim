/**
 * The week — BRIEF §5.
 *
 * THE CLOCK IS STILL DAILY. §5 is explicit about that, and it has to stay that
 * way: the section's own example — skip the party and play the gig sharp, or go
 * and pay for it with tomorrow's performance — only means anything if days
 * resolve one at a time. The week is the PLANNING SURFACE, not the turn. You lay
 * out seven days at once, then they happen in order and can be interrupted.
 *
 * Energy is what makes the plan a plan. A day now holds up to TWO activities
 * (morning/afternoon) — because a real day is not one thing, it is a few —
 * but the day is still finite: each activity costs a fraction of its full price,
 * and a second one on the same day spends into reserves you would rather keep.
 * The numbers below are tuned so roughly six or seven activities a week is
 * sustainable and cramming two-a-day all week walks you into burnout. You still
 * cannot do everything; you just get to divide the day. Rest — an empty day —
 * is therefore still a real move, exactly what §5 means by "some days are rest
 * or nothing at all".
 */

import { routeById, type RouteId } from './routes.ts'
import { clamp } from './traits.ts'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export type DayName = (typeof DAYS)[number]
export const DAYS_IN_WEEK = DAYS.length

export const MAX_ENERGY = 100
export const START_ENERGY = 100

/**
 * Sleep. You get this every night no matter how the day went.
 *
 * These two are tuned together against an average action cost of ~17, and the
 * gradient they produce is the game: roughly break-even at five action days,
 * bleeding at six, collapsing at seven, recovering at four. Measured with
 * tools/week-balance.ts — change either and re-run it, because a loop that is
 * comfortable at five action days has no plan in it at all.
 */
export const NIGHTLY_RECOVERY = 5
/** A day given over to doing nothing, on top of the nightly recovery. */
export const REST_RECOVERY = 25

/**
 * Below this you're running on empty: days go badly and mood drops. This is the
 * loop's own stake, and the pressure §16's strain/addiction chain will later
 * plug into — it is NOT that chain, which is a whole system of its own.
 */
export const BURNOUT_THRESHOLD = 20

/** A day holds up to two activities, in the order you'd do them. Empty = rest. */
export const MAX_SLOTS_PER_DAY = 2

/**
 * What one activity costs, as a fraction of its full-day price (see routes.ts).
 *
 * Below 1 for two reasons, both of which the loop needs. A single-activity day
 * is now genuinely lighter than it used to be — you did one thing, not the whole
 * day of it — so a focused week recovers. But two activities on one day still
 * cost more than one used to (2 × 0.6 = 1.2×), so a packed week drains you faster
 * than the old one-thing-a-day rhythm ever could. That gap is the plan: you can
 * do more per day, but not for free, and not all week.
 *
 * Tuned against tools/week-balance.ts — change it and re-run, or the board's
 * burnout warning drifts away from what the week actually does.
 */
export const SLOT_ENERGY_FACTOR = 0.6

/** Energy one activity spends. Rest spends nothing (see recovery above). */
export const slotEnergyCost = (routeId: RouteId): number =>
  routeId === 'rest' ? 0 : Math.round(routeById(routeId).energy * SLOT_ENERGY_FACTOR)

/** A day's activities (0–2), in resolve order. An empty list is a rest day. */
export type DayPlan = readonly RouteId[]

/** A week's plan: seven days, each holding up to two activities. */
export type WeekPlan = readonly DayPlan[]

export const emptyPlan = (): WeekPlan => DAYS.map(() => [])

export const isBurntOut = (energy: number): boolean => energy < BURNOUT_THRESHOLD

/** A day given over entirely to nothing — that's what earns the rest recovery. */
export const isRestDay = (day: DayPlan): boolean =>
  day.length === 0 || day.every((r) => r === 'rest')

export interface DaySim {
  /** Energy at the start of each activity — what burnout is judged on. */
  readonly slotStarts: readonly number[]
  /** Energy at the end of the day, after recovery. */
  readonly end: number
  /** How many of the day's activities begin in the red. */
  readonly burntSlots: number
}

/**
 * One day, simulated. Activities spend in order with NO recovery between them —
 * the day is one stretch — and the night's recovery (plus the rest bonus, if the
 * day was empty) lands once, at the end. Burnout is judged on the energy each
 * activity STARTS with, so the tiring one is the second thing you piled on when
 * you were already low, which is exactly the realism the two-slot day is for.
 */
export function simulateDay(startEnergy: number, day: DayPlan): DaySim {
  let energy = startEnergy
  const slotStarts: number[] = []
  let burntSlots = 0
  for (const routeId of day) {
    slotStarts.push(energy)
    // Rest is recovery, never ruin — it can't be "burnt" (see resolve.ts).
    if (routeId !== 'rest' && isBurntOut(energy)) burntSlots++
    energy = clamp(energy - slotEnergyCost(routeId), 0, MAX_ENERGY)
  }
  const restLike = isRestDay(day) ? REST_RECOVERY : 0
  return { slotStarts, end: clamp(energy + restLike + NIGHTLY_RECOVERY, 0, MAX_ENERGY), burntSlots }
}

/**
 * Energy at the end of each day if the plan runs as written. This is the whole
 * point of planning a week rather than a day: you can see the wall before you
 * hit it. It's a projection — events during the week will move it.
 */
export function projectEnergy(plan: WeekPlan, startEnergy: number): number[] {
  const out: number[] = []
  let energy = startEnergy
  for (const day of plan) {
    energy = simulateDay(energy, day).end
    out.push(energy)
  }
  return out
}

/**
 * Energy at the START of each day, which is what resolve.ts actually judges
 * burnout on — you're wrecked because of the state you woke up in.
 *
 * Kept distinct from projectEnergy (end-of-day, which drives the bars) because
 * conflating the two puts the warning off by one: a day that *ends* at 19 isn't
 * the ruined day, the one after it is.
 */
export function projectDayStarts(plan: WeekPlan, startEnergy: number): number[] {
  const ends = projectEnergy(plan, startEnergy)
  return plan.map((_, i) => (i === 0 ? startEnergy : (ends[i - 1] ?? startEnergy)))
}

/**
 * Days the plan sends you into the red — days with at least one activity you'd
 * begin with nothing left. Drives the warning on the board, and must agree with
 * resolve.ts or the board is lying to the player about their own plan.
 */
export function burnoutDays(plan: WeekPlan, startEnergy: number): number[] {
  const starts = projectDayStarts(plan, startEnergy)
  return plan
    .map((day, i) => (simulateDay(starts[i] ?? startEnergy, day).burntSlots > 0 ? i : -1))
    .filter((i) => i >= 0)
}

/**
 * Total activities the plan sends you into burnt — the finer count the balance
 * probe checks against what the week actually burns, since a single day can now
 * burn twice.
 */
export function countBurntSlots(plan: WeekPlan, startEnergy: number): number {
  const starts = projectDayStarts(plan, startEnergy)
  return plan.reduce((n, day, i) => n + simulateDay(starts[i] ?? startEnergy, day).burntSlots, 0)
}

export const plannedActionCount = (plan: WeekPlan): number =>
  plan.reduce((n, day) => n + day.filter((r) => r !== 'rest').length, 0)

/**
 * Any plan is playable, including a week of nothing but rest — someone crawling
 * out of burnout needs that, and the bills arrive either way. An exhausting week
 * is likewise a legitimate choice with consequences, not an error. The board
 * warns; it never blocks.
 */
export const canPlayWeek = (_plan: WeekPlan): boolean => true
