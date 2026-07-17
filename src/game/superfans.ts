/**
 * Superfans — BRIEF §14.
 *
 * "Following is an aggregate number; superfans are individuals inside it." This
 * is the layer that turns the scoreboard into faces — named people you can
 * actually know, sitting inside the number §4 counts for you.
 *
 * FOUR TYPES, FOUR PAYOFFS (§14), and they're genuinely different:
 *   - an EVANGELIST grows your Following, week on week
 *   - a COLLECTOR clears your limited drops (§13)
 *   - a CURATOR amplifies you online — a cut on top of what your releases reach
 *   - a RIDE-OR-DIE lifts the room at your gigs (§9) and defends you in a
 *     backlash (§4)
 *
 * ATTENTION IS FINITE (§14). You can only tend to so many people in a week, so
 * nurturing some IS neglecting others. A fan you keep warm pays off; one you let
 * cool drifts, and a neglected superfan can curdle into your loudest critic — a
 * drag on Following and a megaphone in a backlash. The finitude is the whole
 * mechanic: this is a system you cannot max out, only choose within.
 *
 * Warmth is hidden and felt (pillar 2) — surfaced as where a person stands with
 * you, never as a number. Pure and serializable; loop.ts spends the attention
 * and books the weekly payoffs.
 */

import { clamp } from './traits.ts'
import { nextRange, type Rng } from './rng.ts'

export type SuperfanType = 'evangelist' | 'collector' | 'curator' | 'ride_or_die'

export interface Superfan {
  readonly id: number
  readonly name: string
  readonly type: SuperfanType
  /** 0..1, hidden. How they feel about you right now. */
  readonly warmth: number
  /** Curdled — a neglected fan turned critic (§14). */
  readonly critic: boolean
  /** Reset when you tend to them; drives the neglect drift. */
  readonly tendedThisWeek: boolean
}

/** People you can tend to in a week. The scarce resource the system is about. */
export const ATTENTION_PER_WEEK = 2
/** As many named faces as the layer holds — past this it's a scoreboard again. */
export const MAX_SUPERFANS = 8

const NURTURE_GAIN = 0.22
const NEGLECT_DRIFT = 0.05
const CURDLE_AT = 0.14
const REDEEM_AT = 0.4

/**
 * Following marks where a new face emerges from the crowd. Spaced out so a
 * superfan arriving is an event, not a trickle, and the later ones need real
 * reach to reach.
 */
const EMERGENCE_THRESHOLDS: readonly number[] = [80, 250, 600, 1200, 2500, 5000, 10_000, 20_000]

const NAMES: readonly string[] = [
  'Priya', 'Dev', 'Marcus', 'Lena', 'Cole', 'Aisha', 'Theo', 'Nadia',
  'Sam', 'Ruth', 'Kai', 'Bex', 'Omar', 'Jo', 'Ivan', 'Mona',
]

const TYPES: readonly SuperfanType[] = ['evangelist', 'collector', 'curator', 'ride_or_die']

/**
 * How many superfans should exist at a given Following — the count of crossed
 * thresholds, capped. loop.ts compares this to how many you have and spawns the
 * difference.
 */
export const superfanTargetCount = (following: number): number =>
  Math.min(MAX_SUPERFANS, EMERGENCE_THRESHOLDS.filter((t) => following >= t).length)

/** Make a new superfan — seeded, so the run stays reproducible. */
export function makeSuperfan(id: number, taken: readonly string[], rng: Rng): { fan: Superfan; rng: Rng } {
  const free = NAMES.filter((n) => !taken.includes(n))
  const pool = free.length > 0 ? free : NAMES
  const nameRoll = nextRange(rng, 0, pool.length)
  const typeRoll = nextRange(nameRoll.rng, 0, TYPES.length)
  return {
    fan: {
      id,
      name: pool[Math.floor(nameRoll.value)] ?? 'Someone',
      type: TYPES[Math.floor(typeRoll.value)] ?? 'evangelist',
      // They arrive already fond of you — that's why they stepped forward.
      warmth: 0.55,
      critic: false,
      tendedThisWeek: false,
    },
    rng: typeRoll.rng,
  }
}

/** Tend to someone: warmth up, and they don't drift this week. */
export function nurture(fan: Superfan): Superfan {
  const warmth = clamp(fan.warmth + NURTURE_GAIN, 0, 1)
  return {
    ...fan,
    warmth,
    tendedThisWeek: true,
    // Enough warmth back and a critic comes around again (§14 works both ways).
    critic: fan.critic ? warmth < REDEEM_AT : false,
  }
}

/**
 * The weekly drift for one fan. Left untended, warmth cools; cool enough and a
 * fan curdles into a critic. Tended fans hold. Returns the fan after the week.
 */
export function driftFan(fan: Superfan): Superfan {
  if (fan.tendedThisWeek) return fan
  const warmth = clamp(fan.warmth - NEGLECT_DRIFT, 0, 1)
  return { ...fan, warmth, critic: warmth <= CURDLE_AT ? true : fan.critic }
}

/* -------------------------------------------------------------------------- */
/* Payoffs — what the people inside the number actually do                     */
/* -------------------------------------------------------------------------- */

const warmFans = (fans: readonly Superfan[], type: SuperfanType): Superfan[] =>
  fans.filter((f) => f.type === type && !f.critic)

/** Evangelists grow Following; a warm one brings a few people each week. */
export function evangelistFollowing(fans: readonly Superfan[]): number {
  return warmFans(fans, 'evangelist').reduce((sum, f) => sum + Math.round(4 + f.warmth * 12), 0)
}

/** Curators amplify — a cut on top of whatever your releases reached this week. */
export function curatorAmplification(fans: readonly Superfan[]): number {
  return warmFans(fans, 'curator').reduce((sum, f) => sum + 0.12 * f.warmth, 0)
}

/** Collectors clear limited drops — extra units bought straight off a scarce run. */
export function collectorPower(fans: readonly Superfan[]): number {
  return warmFans(fans, 'collector').reduce((sum, f) => sum + f.warmth, 0)
}

/** A ride-or-die lifts the room — added to the opening crowd at a gig (§9). */
export function crowdBump(fans: readonly Superfan[]): number {
  return Math.round(warmFans(fans, 'ride_or_die').reduce((sum, f) => sum + f.warmth * 5, 0))
}

/**
 * How much your people move a backlash (§4). Ride-or-dies defend you (softening
 * it); critics pile on (sharpening it). Positive = defended, negative = worse.
 */
export function backlashSwing(fans: readonly Superfan[]): number {
  const defend = warmFans(fans, 'ride_or_die').reduce((sum, f) => sum + f.warmth, 0)
  const critics = fans.filter((f) => f.critic).length
  return defend * 0.5 - critics * 0.4
}

/** The steady drag of everyone you let curdle — lost Following each week. */
export function criticDrag(fans: readonly Superfan[]): number {
  return fans.filter((f) => f.critic).reduce((sum, f) => sum + Math.round(6 + (1 - f.warmth) * 8), 0)
}

/* -------------------------------------------------------------------------- */
/* Saying it out loud                                                          */
/* -------------------------------------------------------------------------- */

export function typeLabel(type: SuperfanType): string {
  switch (type) {
    case 'evangelist':
      return 'Evangelist'
    case 'collector':
      return 'Collector'
    case 'curator':
      return 'Curator'
    case 'ride_or_die':
      return 'Ride-or-die'
  }
}

/** What this person does for you, in a line. */
export function typeBlurb(type: SuperfanType): string {
  switch (type) {
    case 'evangelist':
      return 'Tells everyone. Brings you people who bring you people.'
    case 'collector':
      return 'Buys the scarce thing the day it drops.'
    case 'curator':
      return 'Puts you on playlists and in front of the right eyes.'
    case 'ride_or_die':
      return 'Front row every time, and first to defend you when it turns.'
  }
}

/** Where they stand with you — warmth, never as a number. */
export function describeWarmth(fan: Superfan): string {
  if (fan.critic) return 'Turned on you. Loud about it.'
  if (fan.warmth >= 0.8) return "Would run through a wall for you."
  if (fan.warmth >= 0.55) return 'Solid. Genuinely in your corner.'
  if (fan.warmth >= 0.3) return 'Cooling off. You have not shown up for them lately.'
  return 'Almost gone. One more forgotten week and they are done.'
}
