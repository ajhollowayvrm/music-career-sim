/**
 * Resolving a day — BRIEF §5, and the perception filter from §3.
 *
 * Two things happen here, and keeping them apart is the whole design:
 *
 *  1. WHAT HAPPENED. A hidden quality number, from talent, discipline, energy
 *     and a little luck. The player never sees it (pillar 2).
 *  2. HOW YOU READ IT. §3 says the fixed traits "filter self-perception" —
 *     they are not just modifiers, they colour how you see your own work. So the
 *     report is assembled in two parts: an objective line about what occurred,
 *     and a self-read clause chosen by Confidence. Two characters can have the
 *     identical day and read it completely differently — the shaky one
 *     undersells a good session, the certain one shrugs off a bad one.
 *
 * That split is why the numbers can stay hidden and still be felt.
 */

import type { Character } from './character.ts'
import { routeById, type RouteId } from './routes.ts'
import { nextRange, type Rng } from './rng.ts'
import { clamp } from './traits.ts'
import { BURNOUT_THRESHOLD, MAX_ENERGY, NIGHTLY_RECOVERY, REST_RECOVERY } from './week.ts'
import { MAX_TALENT_AT_CREATION } from './talents.ts'
import { songFit, type Song } from './songs.ts'
import { CRED_PER_CREATOR_DAY, CRED_PER_NETWORK_DAY, followingFromCreatorDay } from './fame.ts'

/** What a day paid. Money is thin on purpose — §12 owns the real economy. */
export const DAY_JOB_PAY = 85

export type QualityBand = 'bad' | 'ok' | 'good'

export interface DayResult {
  readonly dayIndex: number
  readonly routeId: RouteId
  /**
   * Overrides the route's name in the log. A gig night (§9) is a day like any
   * other to the week, but it is not a route and calling it "Rest" is a lie.
   */
  readonly routeLabel?: string
  /** Hidden. Never render this. */
  readonly quality: number
  readonly band: QualityBand
  readonly energyAfter: number
  readonly moodAfter: number
  readonly moneyDelta: number
  /** §4. Shown — the world counts these for you. */
  readonly followingDelta: number
  /** §4. Never shown as a number. */
  readonly credDelta: number
  readonly burntOut: boolean
  /** The two-part sentence the player actually reads. */
  readonly report: string
}

const bandOf = (quality: number): QualityBand =>
  quality >= 0.66 ? 'good' : quality >= 0.36 ? 'ok' : 'bad'

/** Mean of the talents a route leans on, normalised 0..1. */
function talentFactor(character: Character, routeId: RouteId): number {
  const talents = routeById(routeId).talents
  if (talents.length === 0) return 0.5
  const total = talents.reduce((sum, id) => sum + character.talents[id], 0)
  return total / talents.length / MAX_TALENT_AT_CREATION
}

/** Mood the route moves, before drift and burnout. */
const MOOD_DELTA: Readonly<Record<RouteId, number>> = {
  rest: 4,
  day_job: -5,
  rehearse: 3,
  make_music: 6,
  creator: 2,
  network: 2,
  apply_bands: -1,
}

/**
 * Mood pulls back toward this every day, proportionally — a person's resting
 * level, not a score that only goes one way.
 *
 * It's homeostasis rather than a flat daily sag, and both halves of that matter.
 * Without any drift, mood is a ratchet: every route but the day job pushes it up
 * and it pins at the ceiling. With a flat sag, it's a death spiral: a few weeks
 * of shifts bottom it out and clawing back from zero takes a month of rest
 * nobody can afford. Pulling toward a baseline gives the shape that's actually
 * true — the grind sinks you, the music lifts you, and left alone you drift back
 * to yourself.
 *
 * The vice still closes: the shifts that keep you solvent are the days that sink
 * your mood, the music that lifts it doesn't pay rent, and mood feeds back into
 * how good the music is. That trade IS §5's opportunity cost, and it falls out
 * of these numbers rather than being scripted.
 *
 * A real bottoming-out belongs to §16's strain/addiction chain, which this loop
 * deliberately does not implement.
 */
const MOOD_BASELINE = 50
const MOOD_REVERSION = 0.06

export interface DayInput {
  readonly dayIndex: number
  readonly routeId: RouteId
  readonly energy: number
  readonly mood: number
  readonly character: Character
  /** The song a 'make_music' day works on, if there is one (§7). */
  readonly song?: Song | undefined
  readonly rng: Rng
}

export function resolveDay(input: DayInput): { result: DayResult; rng: Rng } {
  const { dayIndex, routeId, energy, mood, character, song, rng } = input
  const route = routeById(routeId)

  const startedBurntOut = energy < BURNOUT_THRESHOLD

  // --- What happened -------------------------------------------------------
  // The spread is deliberately wide enough that good and bad days actually
  // happen. Too narrow and everything lands in the middle band, which wastes the
  // self-perception filter below — its interesting cases are the extremes.
  const roll = nextRange(rng, -0.18, 0.18)

  // Energy gates the day hard. Running on empty is the loop's own stake.
  const energyFactor = clamp(energy / MAX_ENERGY, 0, 1)
  const energyTerm = startedBurntOut ? -0.28 : (energyFactor - 0.6) * 0.25

  const quality = clamp(
    0.5 +
      (talentFactor(character, routeId) - 0.5) * 0.55 +
      (character.traits.discipline - 0.5) * 0.3 +
      // Mood feeds back into the work. This is what stops the rent grind from
      // being free: weeks of shifts sink your mood, and a sunk mood makes the
      // music you finally sit down to write worse.
      (mood / 100 - 0.5) * 0.2 +
      energyTerm +
      roll.value,
    0,
    1,
  )
  const band = bandOf(quality)

  // --- Cost ----------------------------------------------------------------
  const recover = routeId === 'rest' ? REST_RECOVERY : 0
  const energyAfter = clamp(energy - route.energy + recover + NIGHTLY_RECOVERY, 0, MAX_ENERGY)

  // §3: "Genre mismatch — your fixed leaning versus the music you're actually
  // making — lowers happiness." The first thing that makes the leanings authored
  // back at creation cost or pay anything.
  //
  // Two deliberate asymmetries:
  //
  // Pivot at 0.6, not 0.5, so a mismatch hurts more than a match helps and only
  // music genuinely close to your taste pays. Writing music you don't love comes
  // out net-negative even though you spent the day on music, which is what §3
  // asks for.
  //
  // Burnout suppresses the bonus entirely: when you are running on nothing, the
  // pleasure of making the thing does not reach you. Without this the loop
  // breaks — a burnt-out, bankrupt player writing music they love climbs to
  // maximum mood, because joy out-earns the burnout penalty every day.
  const fitMood =
    song && routeId === 'make_music' && !startedBurntOut
      ? (songFit(song, character) - 0.6) * 16
      : 0

  const drift = (MOOD_BASELINE - mood) * MOOD_REVERSION
  const moodAfter = clamp(
    mood + (MOOD_DELTA[routeId] ?? 0) + fitMood + drift + (startedBurntOut ? -8 : 0),
    0,
    100,
  )

  const moneyDelta = routeId === 'day_job' ? DAY_JOB_PAY : 0

  // §4. The creator treadmill is the fastest reach in the game and it costs you
  // standing every single day you're on it; the network is the slow opposite.
  // Burnout gates the creator gain — a day you had nothing for reaches nobody.
  const followingDelta =
    routeId === 'creator' && !startedBurntOut ? followingFromCreatorDay(quality) : 0
  const credDelta =
    routeId === 'creator'
      ? CRED_PER_CREATOR_DAY
      : routeId === 'network' && !startedBurntOut
        ? CRED_PER_NETWORK_DAY
        : 0

  return {
    result: {
      dayIndex,
      routeId,
      quality,
      band,
      energyAfter,
      moodAfter,
      moneyDelta,
      followingDelta,
      credDelta,
      burntOut: startedBurntOut,
      report: buildReport(routeId, band, character, startedBurntOut, dayIndex, song, followingDelta),
    },
    rng: roll.rng,
  }
}

/* -------------------------------------------------------------------------- */
/* What happened: objective. The same line regardless of who you are.          */
/* -------------------------------------------------------------------------- */

const OUTCOMES: Readonly<Record<RouteId, Readonly<Record<QualityBand, string>>>> = {
  // Rest always restores energy, whatever the roll — so these lines are about
  // how the day FELT, never about whether it worked. A bad rest day that claims
  // "it did not help" contradicts the mechanic sitting right next to it.
  rest: {
    bad: 'You did nothing, and could not settle to it. Restless the whole day.',
    ok: 'You did nothing much. Slept in. Let the day pass.',
    good: 'You did nothing at all, properly, and woke up feeling like a person.',
  },
  day_job: {
    bad: 'The shift ate the day and most of the evening. You got nothing else done.',
    ok: 'A shift. It paid. You came home and did not pick anything up.',
    good: 'A shift, and an easy one. You even had something left afterwards.',
  },
  rehearse: {
    bad: 'You ran the set and it stayed stubbornly at arms length. Nothing locked in.',
    ok: 'You ran the set a few times. It is roughly where it was.',
    good: 'You ran it until your hands stopped needing you. It is in there now.',
  },
  make_music: {
    bad: 'Four hours, one bad verse, and a chord you have used before.',
    ok: 'You got a verse down and most of a chorus. It exists, at least.',
    good: 'It came out almost whole. Two verses, a chorus that lands, an ending.',
  },
  creator: {
    bad: 'You filmed, cut, posted. It went nowhere and took the whole day.',
    ok: 'You filmed, cut, posted, replied to everyone. The numbers moved a little.',
    good: 'You posted and it caught. Not a fire — but people you do not know watched it.',
  },
  network: {
    bad: 'You stood at the edge of a room for three hours and left having said nothing.',
    ok: 'You went out. Talked to a few people. One of them might remember you.',
    good: 'You went out and it worked — you talked to people who actually do things.',
  },
  apply_bands: {
    bad: 'You sent the messages. Two bounced. Nobody replied.',
    ok: 'You answered the ads and sent a few messages. Now you wait.',
    good: 'You sent them out, and two came back the same day wanting to hear more.',
  },
}

/* -------------------------------------------------------------------------- */
/* How you read it: filtered by Confidence (§3 — traits filter self-perception)*/
/* -------------------------------------------------------------------------- */

const SHAKY = 0.4
const CERTAIN = 0.65

/**
 * The self-read. Returns '' in the middle, where a person just takes the day at
 * face value and there's nothing to add.
 */
function selfRead(band: QualityBand, confidence: number): string {
  const shaky = confidence <= SHAKY
  const certain = confidence >= CERTAIN
  if (!shaky && !certain) return ''

  if (band === 'good') {
    // A good day is the sharpest test of self-perception: the shaky character
    // cannot hold onto it.
    return shaky
      ? 'You will find something wrong with it tomorrow.'
      : 'You knew it while it was happening.'
  }
  if (band === 'bad') {
    return shaky ? 'You wonder, again, what exactly you are doing.' : 'Off day. It happens.'
  }
  return shaky ? 'You think it was fine. You are not sure.' : 'Fine. It is a long game.'
}

/**
 * Burnout speaks over the self-read: when you're this empty, how you see
 * yourself stops being the loudest thing in the room.
 *
 * Several lines, walked by day, because a burnt week prints one of these every
 * single day — one fixed sentence seven times reads as a bug, not as exhaustion.
 * Deliberately not a random pick: the RNG is for outcomes, and a report doesn't
 * need to burn a roll to avoid repeating itself.
 */
const BURNOUT_LINES: readonly string[] = [
  'You are running on nothing, and it shows.',
  'There was nothing in the tank to spend.',
  'You have not been this tired in a long time.',
  'You got through the day. That is all you did.',
  'Everything is taking twice as long as it should.',
]

/**
 * Recording is a different job from writing (§7's two dimensions), so it needs
 * its own lines — "you got a verse down" is nonsense at a mixing desk.
 */
const RECORDING_OUTCOMES: Readonly<Record<QualityBand, string>> = {
  bad: 'You tracked it and tracked it again. All of it sounds like a demo, because it is one.',
  ok: 'You got a take down. It is not the one, but it is a take.',
  good: 'You got the take. The one where it stops sounding like a recording of a song.',
}

/** A make-music day with nothing on the bench. §5: the day is still spent. */
const NOTHING_TO_WORK_ON =
  'You sat down to work and realised there was nothing on the bench. The day went anyway.'

function buildReport(
  routeId: RouteId,
  band: QualityBand,
  character: Character,
  burntOut: boolean,
  dayIndex: number,
  song: Song | undefined,
  followingDelta: number,
): string {
  let what: string
  if (routeId === 'make_music') {
    if (!song) return NOTHING_TO_WORK_ON
    what = song.phase === 'recording' ? RECORDING_OUTCOMES[band] : OUTCOMES.make_music[band]
  } else {
    what = OUTCOMES[routeId][band]
  }

  // Follower counts are the one figure a creator day can honestly report — the
  // platform puts it in front of you (§4). It's also the hook that makes the
  // treadmill tempting, which is exactly the trap §4 wants it to be.
  if (routeId === 'creator' && followingDelta > 0) {
    what += ` ${followingDelta} new ${followingDelta === 1 ? 'follower' : 'followers'}.`
  }

  const tail = burntOut
    ? BURNOUT_LINES[dayIndex % BURNOUT_LINES.length]
    : selfRead(band, character.traits.confidence)
  return tail ? `${what} ${tail}` : what
}
