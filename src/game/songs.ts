/**
 * Songs — BRIEF §7.
 *
 * "The song's quality is abstract underneath, but its identity is the player's."
 * That line splits this file in half. IDENTITY — title, genre, themes — is
 * authored and never touched by the engine. QUALITY — composition and
 * production — is computed, hidden, and never shown (pillar 2).
 *
 * §7 asks for exactly two quality dimensions: Composition (the writing) and
 * Production (the recording). They accrue separately, in separate phases, from
 * different talents.
 *
 * Solo only, deliberately. §7 says "bedroom demos alone early, then something
 * larger once you're in a band" — the band half is §8's, and inventing bandmate
 * chemistry here would be building §8 badly.
 *
 * Gear does not exist yet either. §7 says production is where gear matters most;
 * §10 owns that, and until it lands production leans on talent alone.
 */

import { AXIS_IDS, GENRES, type Genre } from './genres.ts'
import type { Character } from './character.ts'
import { clamp } from './traits.ts'
import { MAX_TALENT_AT_CREATION } from './talents.ts'

/**
 * Themes are pure identity — §7 wants the player authoring as much as possible,
 * and explicitly stops short of full lyrics because they can't be made
 * mechanically meaningful. Themes are the same: they are what the song is ABOUT,
 * they are remembered and shown, and they move no number. Resist wiring them to
 * one; that would make them a stat with a costume on.
 */
export const THEMES: readonly string[] = [
  'Leaving',
  'Home',
  'Someone',
  'Anger',
  'God',
  'Money',
  'The city',
  'Nights out',
  'Regret',
  'Defiance',
  'Work',
  'Getting out',
]

export const MAX_THEMES = 3

export type SongPhase = 'writing' | 'recording' | 'released'

/**
 * How a song went out — BRIEF §4/§7. Chosen at release, not creation.
 *
 * streaming — you put it up yourself. Slow, steady reach; it keeps all its
 *   underground standing; costs you nothing but the wait.
 * creator   — you push it on YouTube/TikTok. Far more reach, catches faster, but
 *   the grind reads as populist: it costs Cred and a little money to make the
 *   content, and the scene rates it less. §4's fork, made a release-time choice.
 */
export type ReleaseChannel = 'streaming' | 'creator'

export interface Song {
  readonly id: number
  /** Authored. Never generated. */
  readonly title: string
  readonly genreId: string
  readonly themes: readonly string[]
  readonly phase: SongPhase
  /**
   * The two authored levers that give a song its soul (§7 identity). Like genre
   * and themes, the player sets them and the engine never touches them — but
   * unlike themes these MOVE numbers, because "upbeat vs slow" is exactly the
   * kind of choice that has to be felt live and on release. 0..1 each.
   *
   * tempo — slow (0) ↔ fast (1).
   * feel  — tender/restrained (0) ↔ furious (1).
   *
   * They feed gig pacing (§9, gig.ts), release trajectory (§7, release.ts), and
   * how the writing sits against your own temperament (§3, resolve.ts). Genre
   * still sets the base; these are why two songs in the same genre are not the
   * same song.
   */
  readonly tempo: number
  readonly feel: number
  /** How it was put out (§4/§7). Set at release; 'streaming' until then. */
  readonly channel: ReleaseChannel
  /** Released through a label (§4)? Set at release; reaches further, pays a cut. */
  readonly underLabel: boolean
  /** 0..1, hidden. The writing. */
  readonly composition: number
  /** 0..1, hidden. The recording. */
  readonly production: number
  readonly writingSessions: number
  readonly recordingSessions: number
  /** Week it went out, or null. */
  readonly releasedWeek: number | null
  readonly weeksOut: number
  readonly trajectory: Trajectory
  readonly earnings: number
  /** §6: a song made in a band is the band's, and its money splits. */
  readonly writtenWithBand: boolean
  /** §7: the EP/album this song went out on, or null for a standalone single. */
  readonly projectId: number | null
}

/** §7's lifecycle: spike-and-decay by default, with two named exceptions. */
export type Trajectory = 'normal' | 'sleeper' | 'viral'

export const newSong = (
  id: number,
  title: string,
  genreId: string,
  themes: readonly string[],
  tempo = 0.5,
  feel = 0.5,
): Song => ({
  id,
  title: title.trim(),
  genreId,
  themes: [...themes],
  tempo: clamp(tempo, 0, 1),
  feel: clamp(feel, 0, 1),
  channel: 'streaming',
  underLabel: false,
  phase: 'writing',
  composition: 0,
  production: 0,
  writingSessions: 0,
  recordingSessions: 0,
  releasedWeek: null,
  weeksOut: 0,
  trajectory: 'normal',
  earnings: 0,
  writtenWithBand: false,
  projectId: null,
})

export const genreOf = (song: Song): Genre =>
  GENRES.find((g) => g.id === song.genreId) ?? GENRES[0]!

/* -------------------------------------------------------------------------- */
/* Quality                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Talent sets the CEILING; sessions only get you to it.
 *
 * This is §2's claim made mechanical — Lyrics and Creativity "drive song quality
 * and originality more than raw playing does", so they dominate the writing
 * ceiling and instruments don't enter it at all. A strong-lyrics, strong-
 * creativity, mid-instrument build really is an auteur whose songs carry the
 * weight, because their ceiling is high no matter what they can play.
 */
export function compositionCeiling(character: Character): number {
  const { lyrics, creativity, composition } = character.talents
  const weighted = (lyrics * 0.35 + creativity * 0.35 + composition * 0.3) / MAX_TALENT_AT_CREATION
  // Even a beginner can luck into something decent; even a master isn't perfect.
  return clamp(0.25 + weighted * 0.7, 0.25, 0.95)
}

/**
 * Production talent sets the floor of the ceiling; gear is the big lever on top
 * of it (§10). §7 always said this was where gear matters most — `gearBonus` is
 * that promise paid: owned recording gear (see gear.ts) raises the cap here, so
 * a modest producer with a real rig can out-record a better one making do, and
 * selling the rig to make rent literally lowers the ceiling on what you cut next
 * (§11's death spiral). Talent is free and permanent; gear is bought and can be
 * lost — the tension §10 wants.
 */
/**
 * The penalty for recording with no gear at all — §10's soft gate. With nothing
 * but a laptop the best you can cut is a demo, no matter how good a producer you
 * are: the ceiling drops hard and the cap comes down with it. The moment you own
 * even a real mic (the starter tier in gear.ts) the penalty lifts and talent +
 * gear scale normally. Nobody is blocked from recording — it just sounds like
 * what it is until you spend something on it.
 */
export const NO_GEAR_PENALTY = 0.3

export function productionCeiling(character: Character, gearBonus = 0, ownsRecordingGear = true): number {
  const weighted = character.talents.production / MAX_TALENT_AT_CREATION
  const base = 0.2 + weighted * 0.65 + gearBonus
  if (ownsRecordingGear) return clamp(base, 0.2, 0.95)
  // Laptop-lid demos: a hard drop and a low cap, whoever you are.
  return clamp(base - NO_GEAR_PENALTY, 0.1, 0.38)
}

/**
 * Diminishing returns toward the ceiling. The first session on a song does the
 * most; the fifth barely moves it. That's what makes "call it written" a real
 * decision instead of grinding sessions forever.
 */
const APPROACH_RATE = 0.34

export function sessionGain(current: number, ceiling: number, dayQuality: number): number {
  const headroom = Math.max(0, ceiling - current)
  // dayQuality (energy, mood, discipline, luck — see resolve.ts) scales how much
  // of the remaining headroom this particular day closes.
  return headroom * APPROACH_RATE * (0.5 + dayQuality)
}

/** The song, as one hidden number. §7 weights the writing over the recording. */
export const songQuality = (song: Song): number => song.composition * 0.6 + song.production * 0.4

/* -------------------------------------------------------------------------- */
/* Fit — §3's genre mismatch                                                  */
/* -------------------------------------------------------------------------- */

/** Roughly the distance between two genres at opposite corners of the space. */
const MAX_MEANINGFUL_DISTANCE = 2.5

/**
 * How close this song sits to what you actually love. 1 = your exact taste,
 * 0 = music you have no feeling for.
 *
 * §3: "Genre mismatch — your fixed leaning versus the music you're actually
 * making — lowers happiness." This is the first thing in the game that makes the
 * leanings authored at creation matter at all.
 */
export function songFit(song: Song, character: Character): number {
  const axes = genreOf(song).axes
  let sum = 0
  for (const axis of AXIS_IDS) sum += (axes[axis] - character.leanings[axis]) ** 2
  return clamp(1 - Math.sqrt(sum) / MAX_MEANINGFUL_DISTANCE, 0, 1)
}

/**
 * How close the work is, in words.
 *
 * This exists because pillar 2 and §7 pull against each other: quality is hidden,
 * yet "call it written" has to be a real decision — and a decision you make
 * blind isn't a decision, it's a coin toss. So the song tells you how it feels,
 * never what it scores. The top band says plainly that more sessions are waste,
 * because the diminishing returns are invisible and letting someone grind ten
 * pointless days would be a trap, not a challenge.
 *
 * Measured against the character's own ceiling, so "nothing left to add" means
 * nothing left FOR YOU — a better writer would still hear more in it.
 */
export function describeProgress(current: number, ceiling: number): string {
  const closeness = ceiling <= 0 ? 1 : current / ceiling
  if (closeness < 0.25) return 'There is a song in here somewhere. It has not come out yet.'
  if (closeness < 0.55) return 'It is starting to take shape.'
  if (closeness < 0.8) return 'It is close. There is still something to find.'
  if (closeness < 0.93) return 'It is nearly done. Maybe one more session in it.'
  return 'There is nothing left to add. More time on this will not make it better.'
}

/* -------------------------------------------------------------------------- */
/* Soul — §7's tempo/feel levers, §3's temperament                            */
/* -------------------------------------------------------------------------- */

/**
 * How close a song's FEEL sits to your own temperament. This is the second half
 * of §3's happiness story: genre fit (above) is whether you love the KIND of
 * music; this is whether the song's intensity is where you naturally live.
 *
 * Read off the raw↔polished leaning, which is the one axis about heat rather than
 * taste: a raw soul is at home in something furious, a polished one in something
 * restrained. 1 = the song's feel is exactly your temperature, 0 = the opposite.
 */
export function feelResonance(song: Song, character: Character): number {
  // rawPolished runs -1 (raw) .. +1 (polished). Raw wants furious (feel→1),
  // polished wants restrained (feel→0).
  const rawPolished01 = (character.leanings.rawPolished + 1) / 2
  const preferredFeel = 1 - rawPolished01
  return clamp(1 - Math.abs(song.feel - preferredFeel), 0, 1)
}

/** The tempo lever, in words. Pillar 2: identity, never a number. */
export function describeTempo(tempo: number): string {
  if (tempo < 0.2) return 'slow'
  if (tempo < 0.42) return 'unhurried'
  if (tempo < 0.58) return 'mid-tempo'
  if (tempo < 0.8) return 'driving'
  return 'fast'
}

/** How a released song went out, in a couple of words. */
export function describeChannel(channel: ReleaseChannel): string {
  return channel === 'creator' ? 'pushed on the feeds' : 'self-released'
}

/** The feel lever, in words. */
export function describeFeel(feel: number): string {
  if (feel < 0.2) return 'tender'
  if (feel < 0.42) return 'restrained'
  if (feel < 0.58) return 'even'
  if (feel < 0.8) return 'heated'
  return 'furious'
}

/**
 * What choosing these levers means for THIS writer — the read shown before you
 * commit, so the temperament cost (§3) is felt coming. Speaks only when the song
 * pulls noticeably toward or away from where they live.
 */
export function describeSoul(song: Song, character: Character): string {
  const words = `${describeTempo(song.tempo)}, ${describeFeel(song.feel)}`
  const res = feelResonance(song, character)
  if (res >= 0.72) return `Something ${words}. This is your temperature — it will feel like breathing.`
  if (res <= 0.3) return `Something ${words}. That is not really where you live; it will cost you to sit in it.`
  return `Something ${words}.`
}

/**
 * Fit in words — the only way it's ever surfaced. Pillar 2: no number, and no
 * "fit: 0.3" masquerading as prose.
 */
export function describeFit(fit: number): string {
  if (fit >= 0.8) return 'This is the music you actually love.'
  if (fit >= 0.6) return 'This sits close enough to your taste.'
  if (fit >= 0.4) return 'Not quite your thing, but you can hear it.'
  if (fit >= 0.2) return 'You are writing this at arm’s length.'
  return 'You do not love this music, and every session will remind you.'
}
