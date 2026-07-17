/**
 * The week — BRIEF §5.
 *
 * THE CLOCK IS STILL DAILY. §5 is explicit about that, and it has to stay that
 * way: the section's own example — skip the party and play the gig sharp, or go
 * and pay for it with tomorrow's performance — only means anything if days
 * resolve one at a time. The week is the PLANNING SURFACE, not the turn. You lay
 * out seven days at once, then they happen in order and can be interrupted.
 *
 * Energy is what makes the plan a plan. You cannot fill seven days: the numbers
 * below are tuned so roughly four or five action days a week is sustainable and
 * six or seven walks you into burnout. Rest is therefore a real move, which is
 * exactly what §5 means by "some days are rest or nothing at all".
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

/** A week's plan: one route per day, or null for a day not yet decided. */
export type WeekPlan = readonly (RouteId | null)[]

export const emptyPlan = (): WeekPlan => DAYS.map(() => null)

/** Energy after a single day, before events. */
export function energyAfterDay(energy: number, route: RouteId | null): number {
  const spend = route ? routeById(route).energy : 0
  const recover = route === 'rest' ? REST_RECOVERY : 0
  // An undecided day is treated as a rest day for projection purposes — that's
  // what it becomes if you leave it (§5: some days are nothing at all).
  const restLike = route === null ? REST_RECOVERY : recover
  return clamp(energy - spend + restLike + NIGHTLY_RECOVERY, 0, MAX_ENERGY)
}

/**
 * Energy at the end of each day if the plan runs as written. This is the whole
 * point of planning a week rather than a day: you can see the wall before you
 * hit it. It's a projection — events during the week will move it.
 */
export function projectEnergy(plan: WeekPlan, startEnergy: number): number[] {
  const out: number[] = []
  let energy = startEnergy
  for (const route of plan) {
    energy = energyAfterDay(energy, route)
    out.push(energy)
  }
  return out
}

export const isBurntOut = (energy: number): boolean => energy < BURNOUT_THRESHOLD

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
 * Days the plan sends you into the red — days you begin with nothing left.
 * Drives the warning on the board, and must agree with resolve.ts or the board
 * is lying to the player about their own plan.
 */
export function burnoutDays(plan: WeekPlan, startEnergy: number): number[] {
  return projectDayStarts(plan, startEnergy)
    .map((e, i) => (isBurntOut(e) ? i : -1))
    .filter((i) => i >= 0)
}

export const plannedActionCount = (plan: WeekPlan): number =>
  plan.filter((r) => r !== null && r !== 'rest').length

/**
 * Any plan is playable, including a week of nothing but rest — someone crawling
 * out of burnout needs that, and the bills arrive either way. An exhausting week
 * is likewise a legitimate choice with consequences, not an error. The board
 * warns; it never blocks.
 */
export const canPlayWeek = (_plan: WeekPlan): boolean => true
