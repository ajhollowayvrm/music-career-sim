/**
 * Fame — BRIEF §4.
 *
 * "Fame is two stats in tension, not one." Following is reach; Scene Cred is
 * authenticity. They pull against each other, and chasing one actively costs the
 * other — that's what makes purist-vs-populist a strategic fork rather than
 * flavour.
 *
 * ONE IS SHOWN AND ONE IS NOT, deliberately.
 *
 * Following is a raw number on screen. That is not a pillar-2 violation — it's
 * the same exemption money gets: the world counts your followers FOR you and
 * puts the figure in front of you whether you asked or not. §14 even calls it
 * "an aggregate number".
 *
 * Cred is never a number, because nobody anywhere can tell you what your
 * credibility is. It comes back as prose only.
 *
 * That asymmetry is the point. The thing you can measure is the thing that pulls
 * at you; the thing you can't is the thing you lose without noticing.
 *
 * MISSING: gigs. §4 says Cred is built slowly by paying dues at gigs, and §9
 * isn't built — so today Cred comes from underground releases and from being in
 * the scene, and it moves slower than it should. Don't inflate these to
 * compensate; build §9.
 */

import { clamp } from './traits.ts'
import { next, type Rng } from './rng.ts'
import { attention } from './release.ts'
import { LABEL_REACH_MULT } from './label.ts'
import { genreOf, songQuality, type Song } from './songs.ts'

/** 0..1, hidden forever. */
export type Cred = number

export const STARTING_FOLLOWING = 0
/** Not zero: you know a few people. It is not nothing, and it is not much. */
export const STARTING_CRED = 0.08

/**
 * Where a song sits on §2's underground↔mainstream axis, as 0..1.
 * 0 = nobody's heard of it, 1 = built for the radio.
 */
export const mainstreamness = (song: Song): number =>
  clamp((genreOf(song).axes.undergroundMainstream + 1) / 2, 0, 1)

/* -------------------------------------------------------------------------- */
/* Following                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A day on the creator treadmill. §4: "YouTube and shortcuts grow Following
 * fast" — this is the fastest reach in the game, and the Cred cost below is what
 * you pay for it.
 */
export const followingFromCreatorDay = (dayQuality: number): number =>
  Math.round(4 + 26 * dayQuality)

/**
 * How much the release channel (§4/§7) amplifies weekly reach. Pushing a song on
 * the creator platforms reaches far more people than a quiet self-release — the
 * populist lever, paid for in Cred below.
 */
export const CHANNEL_REACH_MULT: Readonly<Record<Song['channel'], number>> = {
  streaming: 1,
  creator: 1.7,
}

/** The Cred a channel earns, as a fraction of the underground rate. */
export const CHANNEL_CRED_MULT: Readonly<Record<Song['channel'], number>> = {
  streaming: 1,
  creator: 0.25,
}

/**
 * A released song's reach this week. Mainstream music reaches further — that's
 * the whole populist case, and it's why the axis authored at creation decides
 * more than taste. The channel it went out on multiplies that reach again.
 */
export function followingFromRelease(song: Song): number {
  if (song.phase !== 'released') return 0
  const a = attention(song.weeksOut, song.trajectory)
  const reach = a * songQuality(song) * 45 * (0.4 + 0.6 * mainstreamness(song))
  // A label's machine reaches far more people (§4) — on top of the channel.
  const labelMult = song.underLabel ? LABEL_REACH_MULT : 1
  return Math.round(reach * CHANNEL_REACH_MULT[song.channel] * labelMult)
}

/* -------------------------------------------------------------------------- */
/* Cred                                                                       */
/* -------------------------------------------------------------------------- */

/** The treadmill costs you, every day you're on it. §4. */
export const CRED_PER_CREATOR_DAY = -0.006
/** Being in the room, talking to people who actually do this. */
export const CRED_PER_NETWORK_DAY = 0.004

/**
 * A released song's Cred this week — the mirror of reach. Underground music
 * earns respect and no numbers; mainstream music earns numbers and no respect.
 *
 * The rate is deliberately mean. §4 says Cred is built SLOWLY, and by paying
 * dues at gigs — which don't exist yet. At 0.12 a purist maxed out inside twenty
 * weeks without ever playing a room, which is both too fast and the wrong story.
 * Records alone should get you known in the scene and no further; the rest is
 * §9's to give. Raise this when gigs land, not before.
 */
export function credFromRelease(song: Song): number {
  if (song.phase !== 'released') return 0
  const a = attention(song.weeksOut, song.trajectory)
  const underground = 1 - mainstreamness(song)
  // Chasing reach on the creator platforms earns a fraction of the standing a
  // quiet release would — the other half of §4's fork.
  return a * songQuality(song) * 0.06 * underground * CHANNEL_CRED_MULT[song.channel]
}

/* -------------------------------------------------------------------------- */
/* Backlash — §4                                                              */
/* -------------------------------------------------------------------------- */

/**
 * "Any move that reads as selling out risks a backlash event."
 *
 * Note what's required: you can only sell out if you had something to sell.
 * Putting out a pop record with no Cred is just a pop record — nobody is
 * betrayed. The risk scales with how mainstream the move is AND how much
 * standing you had to trade, which is why this reads `cred` as well as the song.
 */
export const BACKLASH_CRED_COST = 0.16

const SELLOUT_THRESHOLD = 0.6
const CRED_TO_LOSE = 0.3

export function backlashChance(song: Song, cred: Cred): number {
  const m = mainstreamness(song)
  if (m <= SELLOUT_THRESHOLD || cred <= CRED_TO_LOSE) return 0
  return clamp((m - SELLOUT_THRESHOLD) * cred * 1.6, 0, 0.6)
}

export function rollBacklash(song: Song, cred: Cred, rng: Rng): { backlash: boolean; rng: Rng } {
  const chance = backlashChance(song, cred)
  if (chance <= 0) return { backlash: false, rng }
  const r = next(rng)
  return { backlash: r.value < chance, rng: r.rng }
}

/* -------------------------------------------------------------------------- */
/* Saying it out loud                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Following, for display. Compact because it sits in a phone-width status bar
 * and because past a thousand the exact figure stops meaning anything — which
 * is itself true to the thing being counted.
 */
export function formatFollowing(following: number): string {
  if (following < 1000) return String(following)
  if (following < 100_000) return `${(following / 1000).toFixed(1)}k`
  return `${Math.round(following / 1000)}k`
}

/** Cred, in words. The only way it is ever surfaced. */
export function describeCred(cred: Cred): string {
  if (cred < 0.12) return 'Nobody in the scene knows your name.'
  if (cred < 0.3) return 'A few people have heard of you. None of them have decided about you yet.'
  if (cred < 0.5) return 'The scene knows who you are.'
  if (cred < 0.72) return 'People whose opinion you care about take you seriously.'
  return 'You are one of the ones they point to.'
}

/**
 * The gap between reach and respect — §6's "real credibility gap between online
 * reach and live chops", where scenes are split on the viral musician.
 *
 * Returns null when the two are roughly in step, because a career that adds up
 * doesn't need remarking on. It's the mismatch that's a story.
 */
export function describeGap(following: number, cred: Cred): string | null {
  // Where this Following would sit if it had been earned in the scene. Log,
  // because the first hundred people mean more than the next thousand.
  const reach = clamp(Math.log10(Math.max(1, following)) / 4.5, 0, 1)

  if (reach - cred > 0.3) {
    return following > 2000
      ? 'You have numbers a lot of people would kill for, and the scene has noticed you did not earn them here.'
      : 'More people know your name than respect it.'
  }
  if (cred - reach > 0.3) {
    return 'The people who matter rate you. Almost nobody else has heard of you.'
  }
  return null
}
