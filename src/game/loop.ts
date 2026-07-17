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
  compositionCeiling,
  newSong,
  productionCeiling,
  sessionGain,
  type Song,
} from './songs.ts'
import { rollTrajectory, weeklyEarning } from './release.ts'
import {
  BACKLASH_CRED_COST,
  STARTING_CRED,
  STARTING_FOLLOWING,
  credFromRelease,
  followingFromRelease,
  rollBacklash,
} from './fame.ts'
import { clamp } from './traits.ts'
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
  /** Everything you've ever written (§7). */
  readonly songs: readonly Song[]
  /** The song 'make music' days work on. Null = the bench is empty. */
  readonly activeSongId: number | null
  /** Ids come from a counter, not Date/random — state stays serializable. */
  readonly nextSongId: number
  /** What the catalog paid in the week just played. */
  readonly lastCatalogEarnings: number
  /** §4. Reach. Shown — the world counts it for you. */
  readonly following: number
  /** §4. Standing, 0..1. Never shown as a number. */
  readonly cred: number
  /** Reach gained in the week just played, for the summary. */
  readonly lastFollowingGain: number
  /** Titles of songs that triggered a backlash on release this week (§4). */
  readonly lastBacklash: readonly string[]
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
    songs: [],
    activeSongId: null,
    nextSongId: 1,
    lastCatalogEarnings: 0,
    following: STARTING_FOLLOWING,
    cred: STARTING_CRED,
    lastFollowingGain: 0,
    lastBacklash: [],
    rng: makeRng(seed),
  }
}

export const songById = (state: LoopState, id: number | null): Song | undefined =>
  id === null ? undefined : state.songs.find((s) => s.id === id)

export const activeSong = (state: LoopState): Song | undefined =>
  songById(state, state.activeSongId)

/** Songs still being made — the bench. */
export const workbench = (state: LoopState): readonly Song[] =>
  state.songs.filter((s) => s.phase !== 'released')

export const released = (state: LoopState): readonly Song[] =>
  state.songs.filter((s) => s.phase === 'released')

export type LoopAction =
  | { type: 'setDay'; dayIndex: number; routeId: RouteId | null }
  | { type: 'clearPlan' }
  | { type: 'playWeek' }
  | { type: 'advanceDay'; character: Character }
  | { type: 'finishWeek' }
  | { type: 'nextWeek' }
  // §7
  | { type: 'startSong'; title: string; genreId: string; themes: readonly string[] }
  | { type: 'setActiveSong'; songId: number }
  | { type: 'callItWritten'; songId: number }
  | { type: 'releaseSong'; songId: number }
  | { type: 'abandonSong'; songId: number }

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
      const song = activeSong(state)

      const { result, rng } = resolveDay({
        dayIndex,
        routeId,
        energy: state.energy,
        mood: state.mood,
        character: action.character,
        song,
        rng: state.rng,
      })

      // A day of music moves the song on the bench (§7). Talent sets the
      // ceiling; the day's quality decides how much of the remaining headroom
      // this session closes.
      let songs = state.songs
      if (routeId === 'make_music' && song && song.phase !== 'released') {
        songs = state.songs.map((s) => {
          if (s.id !== song.id) return s
          if (s.phase === 'writing') {
            return {
              ...s,
              composition: s.composition + sessionGain(s.composition, compositionCeiling(action.character), result.quality),
              writingSessions: s.writingSessions + 1,
            }
          }
          return {
            ...s,
            production: s.production + sessionGain(s.production, productionCeiling(action.character), result.quality),
            recordingSessions: s.recordingSessions + 1,
          }
        })
      }

      // Resolving a day never ends the week. It used to, and that silently ate
      // Sunday: the seventh day resolved and the screen flipped to the summary
      // in the same tick, so its report was never read. Closing the week is
      // 'finishWeek', which the player asks for once they've seen all seven.
      return {
        ...state,
        rng,
        days: [...state.days, result],
        songs,
        energy: result.energyAfter,
        mood: result.moodAfter,
        money: state.money + result.moneyDelta,
        following: state.following + result.followingDelta,
        cred: clamp(state.cred + result.credDelta, 0, 1),
      }
    }

    case 'finishWeek': {
      if (state.phase !== 'resolving' || state.days.length < DAYS_IN_WEEK) return state

      // The catalog pays, then the bills land. Income arrives in dribs against a
      // lump sum — that squeeze is §12's whole point.
      const catalogEarnings = state.songs.reduce((sum, s) => sum + weeklyEarning(s), 0)

      // §4: what's out in the world also brings reach and standing, and which of
      // the two depends on where the song sits on the underground↔mainstream
      // axis. Mainstream reaches further; underground earns respect. Same songs,
      // opposite currencies — that's the fork.
      const followingGain = state.songs.reduce((sum, s) => sum + followingFromRelease(s), 0)
      const credGain = state.songs.reduce((sum, s) => sum + credFromRelease(s), 0)

      const aged = state.songs.map((s) =>
        s.phase === 'released'
          ? { ...s, weeksOut: s.weeksOut + 1, earnings: s.earnings + weeklyEarning(s) }
          : s,
      )

      return {
        ...state,
        songs: aged,
        phase: 'summary',
        money: state.money + catalogEarnings - COST_OF_LIVING,
        lastCostOfLiving: COST_OF_LIVING,
        lastCatalogEarnings: catalogEarnings,
        following: state.following + followingGain,
        cred: clamp(state.cred + credGain, 0, 1),
        lastFollowingGain: followingGain + state.days.reduce((s, d) => s + d.followingDelta, 0),
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
        lastCatalogEarnings: 0,
        lastFollowingGain: 0,
        lastBacklash: [],
      }

    /* ---- §7 Songwriting ---------------------------------------------- */

    case 'startSong': {
      if (state.phase !== 'planning') return state
      if (!action.title.trim()) return state
      const song = newSong(state.nextSongId, action.title, action.genreId, action.themes)
      return {
        ...state,
        songs: [...state.songs, song],
        // A new song goes straight on the bench — you started it to work on it.
        activeSongId: song.id,
        nextSongId: state.nextSongId + 1,
      }
    }

    case 'setActiveSong': {
      const song = songById(state, action.songId)
      if (!song || song.phase === 'released') return state
      return { ...state, activeSongId: action.songId }
    }

    case 'callItWritten': {
      const song = songById(state, action.songId)
      if (!song || song.phase !== 'writing') return state
      // No minimum. Releasing a half-written song is a legitimate bad decision,
      // and §5's whole posture is that the game warns rather than blocks.
      return {
        ...state,
        songs: state.songs.map((s) => (s.id === song.id ? { ...s, phase: 'recording' } : s)),
      }
    }

    case 'releaseSong': {
      if (state.phase !== 'planning') return state
      const song = songById(state, action.songId)
      if (!song || song.phase !== 'recording') return state

      const rolled = rollTrajectory(song, state.rng)

      // §4: "any move that reads as selling out risks a backlash event." Only a
      // mainstream release, and only if you had standing to trade — a pop record
      // from someone with no Cred betrays nobody.
      const back = rollBacklash(song, state.cred, rolled.rng)

      return {
        ...state,
        rng: back.rng,
        songs: state.songs.map((s) =>
          s.id === song.id
            ? {
                ...s,
                phase: 'released',
                releasedWeek: state.week,
                weeksOut: 0,
                trajectory: rolled.trajectory,
              }
            : s,
        ),
        cred: back.backlash ? clamp(state.cred - BACKLASH_CRED_COST, 0, 1) : state.cred,
        lastBacklash: back.backlash ? [...state.lastBacklash, song.title] : state.lastBacklash,
        // It's out; it can't be worked on any more.
        activeSongId: state.activeSongId === song.id ? null : state.activeSongId,
      }
    }

    case 'abandonSong': {
      if (state.phase !== 'planning') return state
      const song = songById(state, action.songId)
      if (!song || song.phase === 'released') return state
      return {
        ...state,
        songs: state.songs.filter((s) => s.id !== song.id),
        activeSongId: state.activeSongId === song.id ? null : state.activeSongId,
      }
    }
  }
}

/** Money earned across the week just played. */
export const weekEarnings = (state: LoopState): number =>
  state.days.reduce((sum, d) => sum + d.moneyDelta, 0)

/**
 * Money, for display. The sign goes before the currency, not after it — plain
 * interpolation gives "£-59", which reads as a typo rather than as debt.
 *
 * Money is the one number the game shows (§12 makes it the game-over factor, so
 * it has to be countable); everything else is felt.
 */
export const formatMoney = (amount: number): string =>
  `${amount < 0 ? '−' : ''}£${Math.abs(amount)}`
