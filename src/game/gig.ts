/**
 * Live gigs — BRIEF §9. Pure; no React.
 *
 * "A gig is two acts: the strategist, then the performer." Both are here:
 * `setlist` is the strategist, `playSong`/`applyBeat` are the performer.
 *
 * Four things §9 asks for that this file is built around:
 *
 *  1. PACING BEATS QUALITY. "Where the loud ones go, where the crowd breathes,
 *     how you close." A great song in the wrong slot lands flat, so `fatigue`
 *     makes the ORDER matter as much as what's in the set.
 *  2. THE PLAYER, NOT THE GEAR. Skill carries a show. Gear (§10) is not read
 *     here and shouldn't be — the brief is explicit, and at the big rooms you're
 *     on the house rig anyway.
 *  3. A TRACKED PERSONA. The game remembers how you normally play, so going
 *     against it is a genuine event — "delightful or alienating".
 *  4. DISASTER STAKES DEPEND ON HANDLING **AND** SCENE. Losing your temper in a
 *     basement is the gig; losing it on a support slot ends the tour.
 *
 * Solo only. §9's band-on-stage half — set-order arguments, per-member stamina,
 * on-nights and off-nights — is §8's, and faking it here would be building §8
 * badly.
 */

import type { Character } from './character.ts'
import { songQuality, type Song } from './songs.ts'
import { GENRES } from './genres.ts'
import { next, nextRange, type Rng } from './rng.ts'
import { clamp } from './traits.ts'
import { MAX_TALENT_AT_CREATION } from './talents.ts'
import type { Venue } from './venues.ts'

/* -------------------------------------------------------------------------- */
/* Shape                                                                      */
/* -------------------------------------------------------------------------- */

export type GigStage = 'setlist' | 'performing' | 'result'

/** A beat the player reads: a song played, a choice made, an event handled. */
export interface GigBeat {
  readonly kind: 'song' | 'choice' | 'event'
  readonly text: string
  readonly crowdAfter: number
  /** Set when this beat was a deviation from the player's usual style (§9). */
  readonly personaBreak?: 'delighted' | 'alienated'
}

export interface GigResult {
  /** 0..1, hidden. How the night actually went. */
  readonly score: number
  readonly credGain: number
  readonly followingGain: number
  readonly money: number
  readonly moodDelta: number
  readonly read: string
}

export interface GigState {
  readonly venueId: string
  readonly dayIndex: number
  readonly stage: GigStage
  /** Song ids, in order. The strategist's whole output. */
  readonly setlist: readonly number[]
  /** How many songs have been played. */
  readonly played: number
  readonly crowd: number
  readonly fatigue: number
  /** Crowd reading after each song — the energy curve, for scoring the night. */
  readonly curve: readonly number[]
  readonly beats: readonly GigBeat[]
  /** Set when something is happening that needs handling before the next song. */
  readonly event: GigEventId | null
  /** True once the player has answered the beat between songs. */
  readonly awaitingSong: boolean
  readonly result: GigResult | null
}

export const CROWD_MAX = 100

/**
 * The room's starting temperature. A crowd that came for you starts warmer; a
 * support slot starts cold, because they did not come for you. §9's "dynamic
 * crowds ... especially once you're well known" lives here.
 *
 * Deliberately well under half. Crowd energy is not "do they know you", it's
 * "are they with you right now" — and even a room full of your own people starts
 * out waiting to see. It also has to leave headroom: if a set opens near the
 * ceiling, the pacing below has nowhere to show and the clamp eats the whole
 * mechanic.
 */
export function openingCrowd(venue: Venue, following: number): number {
  const knownHere = clamp(following / Math.max(1, venue.capacity * 3), 0, 1)
  return clamp(20 + knownHere * 30 + (venue.id === 'headline' ? 8 : 0), 10, 60)
}

export function newGig(venue: Venue, dayIndex: number, following: number): GigState {
  return {
    venueId: venue.id,
    dayIndex,
    stage: 'setlist',
    setlist: [],
    played: 0,
    crowd: openingCrowd(venue, following),
    fatigue: 0,
    curve: [],
    beats: [],
    event: null,
    awaitingSong: true,
    result: null,
  }
}

/** Anything past the writing desk can be played live. */
export const playableSongs = (songs: readonly Song[]): readonly Song[] =>
  songs.filter((s) => s.phase !== 'writing')

/**
 * How loud and driving a song is live. Genre sets the base register, but the
 * per-song levers (§7) are what make two songs of the same genre pace
 * differently: a furious, fast take is a peak; a tender, slow one is a breather.
 * That's the whole point of the levers reaching the stage — the order you set
 * them in is a real decision because the songs themselves now differ.
 */
export const songIntensity = (song: Song): number => {
  const genreIntensity = GENRES.find((g) => g.id === song.genreId)?.intensity ?? 0.5
  return clamp(genreIntensity * 0.5 + song.feel * 0.35 + song.tempo * 0.15, 0, 1)
}

/* -------------------------------------------------------------------------- */
/* Covers — §9's escape hatch for a thin catalogue                            */
/* -------------------------------------------------------------------------- */

/**
 * A cover is not a song you own — it never enters the catalogue. In a setlist it
 * is a sentinel: any negative id is "somebody else's song, played tonight". You
 * cannot show up to an open mic with one original and call it a set; you fill the
 * empty slots with covers, and the trade is that a cover earns you no standing —
 * a room can love it, but nobody in the scene credits you for playing a song
 * everyone already knows (§4: Cred is what you earn for what is yours).
 */
export const COVER_ID = -1
export const isCover = (id: number): boolean => id < 0

/**
 * Where covers are allowed. The small rooms — the open mic, the back room — are
 * where you're expected to pad a short set. Nobody plays a support slot or a
 * headline show on other people's songs, so the bigger rooms want your material.
 */
export const allowsCovers = (venue: Venue): boolean =>
  venue.id === 'open_mic' || venue.id === 'pub_back'

/**
 * Whether you have enough to fill this room's slots. At a cover room a single
 * original is enough — covers make up the rest. Everywhere else you need real
 * songs for every slot, which is its own soft gate on the bigger stages.
 */
export const canFillSet = (venue: Venue, originalCount: number): boolean =>
  allowsCovers(venue) ? originalCount >= 1 : originalCount >= venue.slots

/**
 * Play a cover. A known song is an easy win — the room recognises it and warms a
 * little without you spending much — but the ceiling is low and it clears no
 * fatigue to speak of, because it is not the thing they came to feel. Capped on
 * purpose: a set carried by covers can hold a room, never light it up.
 */
export function playCover(
  crowd: number,
  fatigue: number,
  character: Character,
  energy: number,
  mood: number,
  rng: Rng,
): { outcome: SongOutcome; rng: Rng } {
  // No song of your own, so performanceFactor's song term is neutral — a cover
  // rides familiarity, not your writing.
  const factor = clamp(
    0.5 * (talent01(character, 'stagePresence') * 0.7 + talent01(character, 'voice') * 0.3) +
      0.15 +
      0.1 * (energy / 100) +
      0.1 * (mood / 100),
    0,
    1,
  )
  const roll = nextRange(rng, -0.06, 0.06)
  const held = clamp((factor - 0.4) * 12 + roll.value * 8, -6, 10)
  const crowdNext = clamp(crowd + held - 1, 0, CROWD_MAX)
  const fatigueNext = clamp(fatigue - 0.1, 0, 0.85)
  const text =
    held > 4
      ? 'A cover. They know this one — some of them sing it back. None of it is yours.'
      : 'A cover, to fill the set. It goes down fine. It is somebody else’s song.'
  return { outcome: { crowd: crowdNext, fatigue: fatigueNext, text }, rng: roll.rng }
}

/* -------------------------------------------------------------------------- */
/* The performer                                                              */
/* -------------------------------------------------------------------------- */

const talent01 = (character: Character, id: 'stagePresence' | 'voice'): number =>
  character.talents[id] / MAX_TALENT_AT_CREATION

/**
 * How well you're playing tonight. §9: "It's the player, not the gear" — so this
 * reads stage presence, the song, and the state you turned up in. Gear is
 * deliberately absent.
 */
export function performanceFactor(character: Character, song: Song, energy: number, mood: number): number {
  return clamp(
    0.5 * (talent01(character, 'stagePresence') * 0.7 + talent01(character, 'voice') * 0.3) +
      0.3 * songQuality(song) +
      0.1 * (energy / 100) +
      0.1 * (mood / 100),
    0,
    1,
  )
}

export interface SongOutcome {
  readonly crowd: number
  readonly fatigue: number
  readonly text: string
}

/**
 * How fast a room tires of being shouted at, and how much a loud song costs to
 * play regardless of how it lands.
 *
 * These two numbers are the whole of §9's "pacing ... matters as much as raw
 * song quality", and they are easy to get wrong in a way that silently deletes
 * the mechanic. The first cut had a big lift and a warm opening: the crowd hit
 * the ceiling by the second song, fatigue never bit, and a set of nothing but
 * bangers scored identically to a well-paced one. Spamming the loud ones was
 * simply optimal, which is the opposite of the section.
 *
 * Tuned so that FATIGUE OUTRUNS THE LIFT: by the third consecutive loud song the
 * cost exceeds what it earns and the room actually goes backwards. That's what
 * makes a breather buy something, and what makes the order the decision.
 */
const FATIGUE_PER_INTENSITY = 0.42
const LOUD_SONG_COST = 7

/**
 * Play one song.
 *
 * The loud ones lift a room — until they don't. Every big song adds fatigue and
 * the next one lands flatter, so a set that is all peaks is a set with no peaks.
 * A quiet song costs a little heat and clears the fatigue: that's the crowd
 * breathing, and it's what makes the next loud one land. §9 asks for exactly
 * this, and it's why the ORDER is the decision, not the contents.
 */
export function playSong(
  song: Song,
  crowd: number,
  fatigue: number,
  character: Character,
  energy: number,
  mood: number,
  rng: Rng,
): { outcome: SongOutcome; rng: Rng } {
  const intensity = songIntensity(song)
  const factor = performanceFactor(character, song, energy, mood)
  const roll = nextRange(rng, -0.08, 0.08)

  let crowdNext: number
  let fatigueNext: number
  let text: string

  if (intensity >= 0.5) {
    const landed = (0.2 + factor * 0.9 + roll.value) * intensity * 22 * (1 - fatigue)
    crowdNext = clamp(crowd + landed - LOUD_SONG_COST, 0, CROWD_MAX)
    fatigueNext = clamp(fatigue + FATIGUE_PER_INTENSITY * intensity, 0, 0.85)
    text =
      landed < LOUD_SONG_COST
        ? `${song.title} — another loud one. They have had a lot of loud ones.`
        : landed > 14
          ? `${song.title} goes off. The room moves.`
          : `${song.title}. It does its job.`
  } else {
    // The breather. Costs a little heat, buys back the room's attention — and
    // buys back the headroom the next loud one needs.
    const held = (factor - 0.45) * 18 + roll.value * 10
    crowdNext = clamp(crowd + held - 2, 0, CROWD_MAX)
    fatigueNext = clamp(fatigue - 0.5, 0, 0.85)
    text =
      held > 3
        ? `${song.title}, quiet, and they actually go quiet with you.`
        : `${song.title}. The room breathes. Some of them go to the bar.`
  }

  return { outcome: { crowd: crowdNext, fatigue: fatigueNext, text }, rng: roll.rng }
}

/* -------------------------------------------------------------------------- */
/* Micro-choices between songs                                                */
/* -------------------------------------------------------------------------- */

/**
 * `register` runs -1 (composed, warm, controlled) to +1 (feral, chaotic). It is
 * the axis the persona is tracked on, and the axis the room is judged against.
 */
export interface GigChoice {
  readonly id: string
  readonly label: string
  readonly register: number
  /** Rooms this only becomes available in — §9: choices expand as you go on. */
  readonly minSlots?: number
}

export const CHOICES: readonly GigChoice[] = [
  { id: 'straight_in', label: 'Say nothing. Straight into the next one.', register: -0.1 },
  { id: 'talk', label: 'Talk to them. Say something true.', register: -0.7 },
  { id: 'thank', label: 'Thank the room, name the venue.', register: -0.4 },
  { id: 'wind_up', label: 'Wind them up.', register: 0.7 },
  // Only lands in a room big enough to have a back to shout at.
  { id: 'go_feral', label: 'Go at it. Let it get away from you.', register: 1, minSlots: 4 },
]

export const choicesFor = (venue: Venue): readonly GigChoice[] =>
  CHOICES.filter((c) => (c.minSlots ?? 0) <= venue.slots)

/* -------------------------------------------------------------------------- */
/* Events — §9                                                                */
/* -------------------------------------------------------------------------- */

export type GigEventId = 'heckler' | 'amp' | 'booker'

export interface GigHandling {
  readonly id: string
  readonly label: string
  readonly register: number
  /** §9: "a graceful recovery might gain fans but cost money". */
  readonly cost?: number
}

export interface GigEvent {
  readonly id: GigEventId
  readonly text: string
  readonly handlings: readonly GigHandling[]
}

export const GIG_EVENTS: Readonly<Record<GigEventId, GigEvent>> = {
  heckler: {
    id: 'heckler',
    text: 'Someone near the front has decided to be the show.',
    handlings: [
      { id: 'ignore', label: 'Ignore it. Play on.', register: -0.6 },
      { id: 'answer', label: 'Answer them. Be funnier than they are.', register: 0.1 },
      { id: 'go_at_them', label: 'Go at them. Properly.', register: 1 },
    ],
  },
  amp: {
    id: 'amp',
    text: 'The amp starts buzzing like a wasp in a jar, and it is getting louder.',
    handlings: [
      { id: 'fix', label: 'Stop. Fix it. Apologise.', register: -0.8, cost: 60 },
      { id: 'play_through', label: 'Play through it and let it howl.', register: 0.8 },
      { id: 'swap', label: 'Borrow whatever is backstage.', register: -0.2, cost: 25 },
    ],
  },
  booker: {
    id: 'booker',
    text: 'There is someone at the back who books this room, and they are watching.',
    handlings: [
      { id: 'play_to_them', label: 'Play it clean. Play it at them.', register: -0.7 },
      { id: 'ignore_them', label: 'Forget they are there. Play to the room.', register: 0.2 },
    ],
  },
}

/**
 * How a handling lands. §9: "Disaster stakes depend on handling AND scene ...
 * some scenes and genres expect a chaotic, poor reaction (à la Nirvana), so
 * reacting 'badly' can be authentic and crowd-pleasing in the right room."
 *
 * So there is no correct handling — only a handling that fits this room. The
 * basement wants it to come apart. The support slot wants you tight. Reading
 * your own scene is the skill.
 */
export function handlingFit(register: number, venue: Venue): number {
  const chaos = (register + 1) / 2
  const roomWantsChaos = (1 - venue.sceneRaw) / 2
  return 1 - Math.abs(chaos - roomWantsChaos)
}

/* -------------------------------------------------------------------------- */
/* Persona — §9                                                               */
/* -------------------------------------------------------------------------- */

/** Enough nights for the room to have an idea of who you are. */
export const PERSONA_SETTLED_AFTER = 6
const DEVIATION = 0.75

/**
 * Whether this choice reads as you, or as a genuine break from you.
 *
 * §9: "The game remembers your normal performance style, so deviating (a mellow
 * performer suddenly going feral) reads as a genuine event — delightful or
 * alienating." Which of the two it is comes down to the room: a mellow player
 * going feral in a basement is the best thing that happened all night; the same
 * move on a support slot is someone having a breakdown in front of strangers.
 *
 * Returns null before the persona has settled — you cannot break a habit you
 * have not formed.
 */
export function personaBreak(
  register: number,
  persona: number,
  samples: number,
  venue: Venue,
): 'delighted' | 'alienated' | null {
  if (samples < PERSONA_SETTLED_AFTER) return null
  if (Math.abs(register - persona) < DEVIATION) return null
  return handlingFit(register, venue) >= 0.5 ? 'delighted' : 'alienated'
}

/* -------------------------------------------------------------------------- */
/* Scoring the night                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The night, as one hidden number.
 *
 * The close is weighted double — §9 asks "how you close", and a set that peaks
 * in the middle and dribbles out is not the same night as one that builds.
 */
export function scoreGig(curve: readonly number[]): number {
  if (curve.length === 0) return 0
  const last = curve[curve.length - 1] ?? 0
  const mean = curve.reduce((a, b) => a + b, 0) / curve.length
  return clamp((mean * 0.55 + last * 0.45) / CROWD_MAX, 0, 1)
}

export function settleGig(
  venue: Venue,
  curve: readonly number[],
  spent: number,
  rng: Rng,
  /** Fraction of the set that was your own material. Covers earn no standing. */
  originalFraction = 1,
): { result: GigResult; rng: Rng } {
  const score = scoreGig(curve)
  const roll = next(rng)

  // §4: this is Cred's main source. A blinding night in a small room is worth
  // more standing than a flat one in a big one — but only your own songs count,
  // so a set padded with covers earns proportionally less of it.
  const credGain = venue.credWeight * score * originalFraction

  // Live reach is slower than the creator treadmill and costs no standing —
  // that's the whole point of it being the other road.
  const followingGain = Math.round(venue.capacity * score * 0.55 * (0.85 + roll.value * 0.3))

  // A good night sells at the door; a bad one still gets the fee.
  const door = Math.round(venue.pay * 0.4 * Math.max(0, score - 0.4))
  const money = venue.pay + door - spent

  return {
    result: {
      score,
      credGain,
      followingGain,
      money,
      moodDelta: Math.round((score - 0.45) * 26),
      read: readGig(score, venue),
    },
    rng: roll.rng,
  }
}

function readGig(score: number, venue: Venue): string {
  if (score >= 0.82) return `They did not want it to end. Nights like that are why anyone does this.`
  if (score >= 0.62) return `A good night. ${venue.name} would have you back.`
  if (score >= 0.42) return 'It was fine. Some of them were watching, most of the time.'
  if (score >= 0.22) return 'You got through it. The room never quite arrived.'
  return 'That was a bad night. You could hear the bar over the top of you.'
}
