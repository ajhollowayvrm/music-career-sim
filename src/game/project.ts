/**
 * Projects — an EP or an album, BRIEF §7/§17 ("solo singles and albums").
 *
 * A single is one song out on its own, which the loop already does. A PROJECT is
 * a body of work: several songs put out together, as one statement. The brief
 * names albums as a rung on the macro ladder (§17) and ties merch to "an album,
 * single, or tour" (§13), so the shape is blessed; the numbers here are ours.
 *
 * What bundling buys — the whole reason to hold songs back and drop them together
 * instead of dribbling singles out:
 *
 *   · REACH. Every song in the project (re)enters the world in the same week, so
 *     their spikes stack into one moment instead of seven small ones, and the
 *     drop itself pulls a wave of new Following up front. An album swings harder
 *     than an EP.
 *   · PRESTIGE. A real body of work reads as artistry — it pays Cred, the
 *     currency singles barely move (§4). An album is the artist's statement; an
 *     EP a smaller one.
 *
 * The cost is the tension: to drop a body of work you hold finished songs back,
 * delaying the income each would have earned as a single. All-in, at once.
 *
 * A project can COMPILE anything you've made — songs still on the bench AND
 * singles already out (a reissue/greatest-hits puts them back in front of
 * people). That was the design call: "an EP with the singles you've made".
 */

import { songQuality, type Song } from './songs.ts'

export type ProjectKind = 'ep' | 'album'

/** An EP is a handful; an album is a full-length. */
export const EP_MIN = 2
export const EP_MAX = 5
export const ALBUM_MIN = 6
/** No point in a "project" bigger than a real record. */
export const PROJECT_MAX = 16

export interface Project {
  readonly id: number
  readonly title: string
  readonly kind: ProjectKind
  readonly week: number
  readonly channel: Song['channel']
  readonly songIds: readonly number[]
}

/** What a given number of songs adds up to — or null if it isn't a project. */
export function kindForCount(count: number): ProjectKind | null {
  if (count >= ALBUM_MIN) return 'album'
  if (count >= EP_MIN && count <= EP_MAX) return 'ep'
  return null
}

export const projectKindLabel = (kind: ProjectKind): string => (kind === 'album' ? 'Album' : 'EP')

/**
 * The up-front wave of new Following a drop pulls. Scales with how many songs are
 * on it and how good they are; an album lands harder than an EP. Deliberately a
 * real number against the tens-per-week a single earns — dropping a record is an
 * event, and it should feel like one.
 */
const FOLLOWING_PER_SONG = 90
const REACH_KIND_MULT: Readonly<Record<ProjectKind, number>> = { ep: 1, album: 1.5 }

export function projectFollowingBump(kind: ProjectKind, songCount: number, avgQuality: number): number {
  return Math.round(FOLLOWING_PER_SONG * songCount * REACH_KIND_MULT[kind] * (0.4 + 0.6 * avgQuality))
}

/**
 * The standing a body of work earns — the prestige singles don't. An album is
 * the statement, so it pays more than an EP. Cred is 0..1 and moves slowly (§4),
 * so even the album figure here is a genuine step, not a landslide.
 */
const CRED_KIND_BASE: Readonly<Record<ProjectKind, number>> = { ep: 0.03, album: 0.08 }

export function projectCredBump(kind: ProjectKind, avgQuality: number): number {
  return CRED_KIND_BASE[kind] * (0.4 + 0.6 * avgQuality)
}

/** Mean hidden quality across the songs on a project — drives both payoffs. */
export function averageQuality(songs: readonly Song[]): number {
  if (songs.length === 0) return 0
  return songs.reduce((sum, s) => sum + songQuality(s), 0) / songs.length
}

/** A song is eligible for a project if it's recorded-and-unreleased or already out. */
export const canBundle = (song: Song): boolean =>
  song.phase === 'recording' || song.phase === 'released'
