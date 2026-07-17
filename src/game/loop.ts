/**
 * The daily loop — BRIEF §5. Pure reducer, no React.
 *
 * Shape: plan a week, then watch it happen a day at a time. The week is the
 * planning surface; the DAY is still the clock, exactly as §5 insists.
 *
 * A booked gig (§9) takes its day and hands control to gig.ts, which is what the
 * day-at-a-time clock was preserved for: a gig is something you play, not
 * something that happens to you while the week resolves past it.
 *
 * Deliberately NOT here, because other sections own them:
 *   §8  the band — no bandmates, so no set-order arguments and no stamina to
 *       manage. Gigs are solo.
 *   §12 the fail state — money moves, but going broke doesn't end anything yet.
 *   §16 events — nothing interrupts a WEEK yet. Gigs have their own in-set
 *       events (§9 names them), but the engine that fires events into ordinary
 *       days is still §16's.
 */

import type { Character } from './character.ts'
import { makeRng, next, nextRange, type Rng } from './rng.ts'
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
import { NIGHTLY_RECOVERY } from './week.ts'
import { VENUES, canPlay, venueById, type Venue } from './venues.ts'
import {
  CROWD_MAX,
  GIG_EVENTS,
  choicesFor,
  handlingFit,
  newGig,
  personaBreak,
  playSong,
  playableSongs,
  settleGig,
  type GigBeat,
  type GigEventId,
  type GigResult,
  type GigState,
} from './gig.ts'
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
 * A gig on the calendar (§9), which is what §5 means by a scheduled commitment
 * creating opportunity cost around it: the day is spoken for, and how you spend
 * the days either side decides whether you turn up sharp or wrecked.
 */
export interface Booking {
  readonly venueId: string
  readonly dayIndex: number
}

/** A gig night costs you the day, like any other. */
export const GIG_ENERGY = 20

export type LoopPhase = 'planning' | 'resolving' | 'gig' | 'summary'

export interface LoopState {
  readonly week: number
  readonly phase: LoopPhase
  readonly energy: number
  readonly mood: number
  readonly money: number
  readonly plan: WeekPlan
  /** §9. One gig a week, on a day you choose. */
  readonly booking: Booking | null
  /** The gig happening right now, if the week has reached it. */
  readonly gig: GigState | null
  /**
   * §9's tracked persona: the running mean of the registers you choose on stage,
   * -1 composed .. +1 feral, and how many nights it's built from. Going against
   * it is an event; you can't break a habit you haven't formed.
   */
  readonly persona: number
  readonly personaSamples: number
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
  /** The gig just played, for the week summary. */
  readonly lastGig: { readonly venueName: string; readonly result: GigResult } | null
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
    booking: null,
    gig: null,
    persona: 0,
    personaSamples: 0,
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
    lastGig: null,
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
  // §9
  | { type: 'bookGig'; venueId: string; dayIndex: number }
  | { type: 'cancelBooking' }
  | { type: 'toggleSetlistSong'; songId: number }
  | { type: 'startPerformance' }
  | { type: 'playNextSong'; character: Character }
  | { type: 'gigChoose'; choiceId: string }
  | { type: 'gigHandle'; handlingId: string }
  | { type: 'finishGig' }

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

      // §9: the gig takes the day. Hand control to the two acts rather than
      // resolving this day automatically — the whole point of a gig is that you
      // play it, not that it happens to you.
      if (state.booking && state.booking.dayIndex === dayIndex) {
        return {
          ...state,
          phase: 'gig',
          gig: newGig(venueById(state.booking.venueId), dayIndex, state.following),
        }
      }

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
        lastGig: null,
        gig: null,
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

    /* ---- §9 Live Gigs ------------------------------------------------ */

    case 'bookGig': {
      if (state.phase !== 'planning') return state
      const venue = VENUES.find((v) => v.id === action.venueId)
      if (!venue || !canPlay(venue, state.following, state.cred)) return state
      if (playableSongs(state.songs).length === 0) return state
      return { ...state, booking: { venueId: venue.id, dayIndex: action.dayIndex } }
    }

    case 'cancelBooking':
      return state.phase === 'planning' ? { ...state, booking: null } : state

    case 'toggleSetlistSong': {
      const gig = state.gig
      if (!gig || gig.stage !== 'setlist') return state
      const venue = venueById(gig.venueId)
      const on = gig.setlist.includes(action.songId)
      if (!on && gig.setlist.length >= venue.slots) return state
      return {
        ...state,
        gig: {
          ...gig,
          // Order is the decision (§9), so this appends rather than sorting —
          // the sequence you build is the sequence you play.
          setlist: on
            ? gig.setlist.filter((id) => id !== action.songId)
            : [...gig.setlist, action.songId],
        },
      }
    }

    case 'startPerformance': {
      const gig = state.gig
      if (!gig || gig.stage !== 'setlist' || gig.setlist.length === 0) return state
      return { ...state, gig: { ...gig, stage: 'performing', awaitingSong: true } }
    }

    case 'playNextSong': {
      const gig = state.gig
      if (!gig || gig.stage !== 'performing' || !gig.awaitingSong) return state
      const songId = gig.setlist[gig.played]
      const song = songById(state, songId ?? -1)
      if (!song) return state

      const { outcome, rng } = playSong(
        song,
        gig.crowd,
        gig.fatigue,
        action.character,
        state.energy,
        state.mood,
        state.rng,
      )
      const played = gig.played + 1
      const curve = [...gig.curve, outcome.crowd]
      const beats: GigBeat[] = [
        ...gig.beats,
        { kind: 'song', text: outcome.text, crowdAfter: outcome.crowd },
      ]

      // Last song — the set is done.
      if (played >= gig.setlist.length) {
        return {
          ...state,
          rng,
          gig: {
            ...gig,
            played,
            crowd: outcome.crowd,
            fatigue: outcome.fatigue,
            curve,
            beats,
            stage: 'result',
            awaitingSong: false,
          },
        }
      }

      // Between songs: sometimes the night has other ideas (§9).
      const eventRoll = next(rng)
      const eventIds: GigEventId[] = ['heckler', 'amp', 'booker']
      const pick = nextRange(eventRoll.rng, 0, eventIds.length)
      const fires = eventRoll.value < 0.22

      return {
        ...state,
        rng: fires ? pick.rng : eventRoll.rng,
        gig: {
          ...gig,
          played,
          crowd: outcome.crowd,
          fatigue: outcome.fatigue,
          curve,
          beats,
          awaitingSong: false,
          event: fires ? (eventIds[Math.floor(pick.value)] ?? 'heckler') : null,
        },
      }
    }

    case 'gigChoose': {
      const gig = state.gig
      if (!gig || gig.stage !== 'performing' || gig.awaitingSong || gig.event) return state
      const venue = venueById(gig.venueId)
      const choice = choicesFor(venue).find((c) => c.id === action.choiceId)
      if (!choice) return state
      return applyBeat(state, gig, venue, choice.register, choice.label)
    }

    case 'gigHandle': {
      const gig = state.gig
      if (!gig || !gig.event) return state
      const venue = venueById(gig.venueId)
      const event = GIG_EVENTS[gig.event]
      const handling = event.handlings.find((h) => h.id === action.handlingId)
      if (!handling) return state
      const after = applyBeat(state, gig, venue, handling.register, handling.label, handling.cost)
      return {
        ...after,
        // §9: "a graceful recovery might gain fans but cost money."
        money: state.money - (handling.cost ?? 0),
        gig: after.gig ? { ...after.gig, event: null } : null,
      }
    }

    case 'finishGig': {
      const gig = state.gig
      if (!gig || gig.stage !== 'result') return state
      const venue = venueById(gig.venueId)
      const { result, rng } = settleGig(venue, gig.curve, 0, state.rng)

      // The gig IS the day — it takes the energy any other day would.
      const energyAfter = clamp(state.energy - GIG_ENERGY + NIGHTLY_RECOVERY, 0, 100)

      const dayResult: DayResult = {
        dayIndex: gig.dayIndex,
        // Not a route — a gig is its own thing. The label is what the log shows.
        routeId: 'rest',
        routeLabel: 'Gig',
        quality: result.score,
        band: result.score >= 0.66 ? 'good' : result.score >= 0.36 ? 'ok' : 'bad',
        energyAfter,
        moodAfter: clamp(state.mood + result.moodDelta, 0, 100),
        moneyDelta: result.money,
        followingDelta: result.followingGain,
        credDelta: result.credGain,
        burntOut: false,
        report: `${venue.name}. ${result.read}`,
      }

      return {
        ...state,
        rng,
        phase: 'resolving',
        gig: { ...gig, result },
        booking: null,
        days: [...state.days, dayResult],
        energy: energyAfter,
        mood: dayResult.moodAfter,
        money: state.money + result.money,
        following: state.following + result.followingGain,
        cred: clamp(state.cred + result.credGain, 0, 1),
        lastGig: { venueName: venue.name, result },
      }
    }
  }
}

/**
 * A between-songs beat: the choice or the handling lands, the room reacts, and
 * your persona takes another sample.
 *
 * §9's persona rule is applied here: a move that goes against how you normally
 * play is an event in itself, and whether it's delightful or alienating is the
 * room's call, not yours.
 */
function applyBeat(
  state: LoopState,
  gig: GigState,
  venue: Venue,
  register: number,
  label: string,
  _cost?: number,
): LoopState {
  const fit = handlingFit(register, venue)
  const brk = personaBreak(register, state.persona, state.personaSamples, venue)

  // The room decides. A fit of 1 is exactly what this room wanted.
  let swing = (fit - 0.5) * 26
  if (brk === 'delighted') swing += 14
  if (brk === 'alienated') swing -= 18

  const crowd = clamp(gig.crowd + swing, 0, CROWD_MAX)

  const text =
    brk === 'delighted'
      ? `${label} Nobody has seen you do that before. They will talk about it.`
      : brk === 'alienated'
        ? `${label} That is not you, and the room can tell.`
        : swing > 6
          ? `${label} It lands.`
          : swing < -6
            ? `${label} It does not land.`
            : label

  const samples = state.personaSamples + 1
  return {
    ...state,
    // Running mean — your style is what you actually keep doing.
    persona: (state.persona * state.personaSamples + register) / samples,
    personaSamples: samples,
    gig: {
      ...gig,
      crowd,
      awaitingSong: true,
      beats: [
        ...gig.beats,
        { kind: gig.event ? 'event' : 'choice', text, crowdAfter: crowd, ...(brk ? { personaBreak: brk } : {}) },
      ],
    },
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
