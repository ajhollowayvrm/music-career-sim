/**
 * The release lifecycle — BRIEF §7.
 *
 * "A release spikes and then decays by default. Exceptions give the catalog a
 * life of its own: a song can slow-burn into popularity over time (a sleeper),
 * or a single track can go viral and spike on its own."
 *
 * The curve here is attention over time. What attention BUYS is not this file's
 * business: today it pays money, which §12 already models as lumpy income
 * arriving against steady bills. When §4 lands, Following and Cred read the same
 * curve — the shape is §7's, the payoff is theirs. That's why `attention` is a
 * bare multiplier and not "streams" or "fans".
 */

import { next, type Rng } from './rng.ts'
import { songQuality, type Song, type Trajectory } from './songs.ts'

/**
 * What a song at full attention and perfect quality earns in a week.
 *
 * Deliberately small. A bedroom demo against £200/wk of rent should be pennies —
 * §12's whole tension is lumpy income that doesn't cover steady bills, and a
 * first song bankrolling a month would dissolve it.
 */
export const SONG_BASE_EARNING = 42

/**
 * Attention in week `w` since release.
 *
 * normal  — out of the gate and gone. Most songs.
 * sleeper — nobody notices, then slowly they do. Peaks around week five.
 * viral   — enormous, brief, and over. The spike is the whole event.
 */
export function attention(weeksOut: number, trajectory: Trajectory): number {
  const w = Math.max(0, weeksOut)
  switch (trajectory) {
    case 'normal':
      return 0.62 ** w
    case 'sleeper':
      // Climbs for five weeks, then decays from a full peak — the slow burn.
      return w < 5 ? 0.28 + 0.145 * w : 0.7 ** (w - 5)
    case 'viral':
      // Two weeks of everything, then the floor drops out.
      if (w === 0) return 6
      if (w === 1) return 3.4
      return 0.3 ** (w - 1)
  }
}

/** Below this a song is functionally forgotten and stops paying. */
const DEAD = 0.02

export const isSpent = (song: Song): boolean =>
  song.phase === 'released' && attention(song.weeksOut, song.trajectory) < DEAD

/** What a released song pays this week. Rounded — money is money. */
export function weeklyEarning(song: Song): number {
  if (song.phase !== 'released') return 0
  const a = attention(song.weeksOut, song.trajectory)
  if (a < DEAD) return 0
  return Math.round(SONG_BASE_EARNING * songQuality(song) * a)
}

/**
 * Rolls how a song behaves once it's out. Quality tilts the odds — a better song
 * catches more easily — but never guarantees anything, because a release
 * catching is not a thing you control. That's the point of it being a roll.
 */
export function rollTrajectory(song: Song, rng: Rng): { trajectory: Trajectory; rng: Rng } {
  const q = songQuality(song)
  const r = next(rng)

  const viralChance = 0.02 + q * 0.05 // 2%..7%
  const sleeperChance = 0.1 + q * 0.08 // 10%..18%

  if (r.value < viralChance) return { trajectory: 'viral', rng: r.rng }
  if (r.value < viralChance + sleeperChance) return { trajectory: 'sleeper', rng: r.rng }
  return { trajectory: 'normal', rng: r.rng }
}

/**
 * How a release is reading this week, in words. Pillar 2 — the player never sees
 * attention, only what it looks like from inside a life.
 */
export function describeRelease(song: Song): string {
  if (song.phase !== 'released') return ''
  const a = attention(song.weeksOut, song.trajectory)

  if (a < DEAD) return 'Nobody is listening to this any more.'
  if (song.trajectory === 'viral' && song.weeksOut <= 1) {
    return 'Something has caught. It is everywhere, and none of it was your doing.'
  }
  if (song.trajectory === 'viral') return 'The spike is over. It was over almost as fast as it started.'
  if (song.trajectory === 'sleeper' && song.weeksOut < 5) {
    return 'Quietly finding people. More this week than last.'
  }
  if (a >= 0.6) return 'People are listening.'
  if (a >= 0.2) return 'A trickle. It has not gone away yet.'
  return 'Almost forgotten.'
}
