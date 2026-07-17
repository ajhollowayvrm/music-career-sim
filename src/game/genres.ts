/**
 * Taste — BRIEF §2 ("Your sound") and §3.
 *
 * Taste is FIXED at creation, like personality. It is not skill: §3 keeps
 * leanings (what you love) strictly apart from talent (what you can do), and the
 * gap between your leaning and the music you actually end up making is what
 * lowers happiness later.
 *
 * The player picks EVERY genre they actually love — a multi-select, not one
 * choice — and those average into a smooth position on three axes. The brief is
 * explicit that averaging (rather than rigid single-genre matching) is the point:
 * nobody only likes one genre. Band-fit is later measured against this position.
 */

export type AxisId = 'rawPolished' | 'rootsExperimental' | 'undergroundMainstream'

export const AXIS_IDS: readonly AxisId[] = [
  'rawPolished',
  'rootsExperimental',
  'undergroundMainstream',
]

/** Each axis runs -1..+1. The sign convention matches the brief's arrow order. */
export type Leanings = Readonly<Record<AxisId, number>>

export interface Genre {
  readonly id: string
  readonly label: string
  readonly axes: Leanings
  /**
   * How loud and driving it is, 0..1. NOT a taste axis — §2 defines exactly
   * three of those and this isn't one of them. It exists because §9's setlist
   * asks "where the loud ones go, where the crowd breathes", and loudness is
   * simply not derivable from raw/roots/underground: lo-fi is not loud, and
   * ambient and folk sit at opposite ends of taste while being equally quiet.
   * Only the setlist reads this.
   */
  readonly intensity: number
}

const at = (rawPolished: number, rootsExperimental: number, undergroundMainstream: number): Leanings => ({
  rawPolished,
  rootsExperimental,
  undergroundMainstream,
})

// Positions are a judgement call, not a fact. They only ever matter relative to
// each other and to a band's position, so internal consistency beats precision.
export const GENRES: readonly Genre[] = [
  { id: 'punk', label: 'Punk', axes: at(-0.9, -0.2, -0.8), intensity: 0.9 },
  { id: 'hardcore', label: 'Hardcore', axes: at(-0.95, 0.0, -0.85), intensity: 1 },
  { id: 'metal', label: 'Metal', axes: at(-0.4, 0.0, -0.3), intensity: 0.9 },
  { id: 'emo', label: 'Emo', axes: at(-0.4, -0.1, -0.2), intensity: 0.6 },
  { id: 'indie_rock', label: 'Indie Rock', axes: at(-0.3, 0.1, -0.3), intensity: 0.5 },
  { id: 'shoegaze', label: 'Shoegaze', axes: at(-0.2, 0.5, -0.5), intensity: 0.45 },
  { id: 'classic_rock', label: 'Classic Rock', axes: at(-0.2, -0.5, 0.4), intensity: 0.65 },
  { id: 'folk', label: 'Folk', axes: at(-0.5, -0.9, -0.3), intensity: 0.15 },
  { id: 'americana', label: 'Americana', axes: at(-0.4, -0.85, -0.2), intensity: 0.3 },
  { id: 'country', label: 'Country', axes: at(-0.1, -0.8, 0.5), intensity: 0.35 },
  { id: 'blues', label: 'Blues', axes: at(-0.45, -0.9, -0.1), intensity: 0.4 },
  { id: 'singer_songwriter', label: 'Singer-Songwriter', axes: at(-0.4, -0.65, -0.15), intensity: 0.15 },
  { id: 'jazz', label: 'Jazz', axes: at(0.0, 0.45, -0.25), intensity: 0.4 },
  { id: 'soul', label: 'Soul', axes: at(0.3, -0.55, 0.3), intensity: 0.5 },
  { id: 'funk', label: 'Funk', axes: at(0.2, -0.45, 0.2), intensity: 0.7 },
  { id: 'rnb', label: 'R&B', axes: at(0.7, -0.25, 0.6), intensity: 0.45 },
  { id: 'hip_hop', label: 'Hip-Hop', axes: at(0.4, -0.15, 0.6), intensity: 0.6 },
  { id: 'pop', label: 'Pop', axes: at(0.95, 0.05, 0.95), intensity: 0.6 },
  { id: 'electronic', label: 'Electronic', axes: at(0.7, 0.5, 0.25), intensity: 0.65 },
  { id: 'house_techno', label: 'House / Techno', axes: at(0.6, 0.3, -0.1), intensity: 0.8 },
  { id: 'ambient', label: 'Ambient', axes: at(0.35, 0.8, -0.6), intensity: 0.05 },
  { id: 'experimental', label: 'Experimental / Noise', axes: at(-0.7, 0.95, -0.9), intensity: 0.5 },
]

export const CENTRE: Leanings = at(0, 0, 0)

/** The average position of everything you love. §2: averaged, never rigid. */
export function averageLeanings(genreIds: readonly string[]): Leanings {
  const picked = GENRES.filter((g) => genreIds.includes(g.id))
  if (picked.length === 0) return CENTRE

  const sum = { rawPolished: 0, rootsExperimental: 0, undergroundMainstream: 0 }
  for (const g of picked) {
    for (const axis of AXIS_IDS) sum[axis] += g.axes[axis]
  }

  return {
    rawPolished: sum.rawPolished / picked.length,
    rootsExperimental: sum.rootsExperimental / picked.length,
    undergroundMainstream: sum.undergroundMainstream / picked.length,
  }
}

/**
 * Taste, in words. Pillar 2 forbids showing the axis values, so this is the only
 * way the player ever sees their own sound. Stays quiet near the middle — a
 * balanced taste is a real answer, not a missing one.
 */
export function describeLeanings(leanings: Leanings): string {
  const words: Record<AxisId, readonly [low: string, high: string]> = {
    rawPolished: ['raw', 'polished'],
    rootsExperimental: ['rooted', 'restless'],
    undergroundMainstream: ['underground', 'built for a big room'],
  }

  const said: string[] = []
  for (const axis of AXIS_IDS) {
    const value = leanings[axis]
    if (Math.abs(value) < 0.2) continue
    const pair = words[axis]
    said.push(value > 0 ? pair[1] : pair[0])
  }

  if (said.length === 0) return 'Your taste sits in the middle of everything — hard to pin, hard to sell.'
  if (said.length === 1) return `Your taste runs ${said[0]}.`
  const last = said[said.length - 1]
  return `Your taste runs ${said.slice(0, -1).join(', ')} and ${last}.`
}

/**
 * A taste pulled hard in two directions at once is a real character, not a
 * mistake — but the player should feel it. Measures the spread of what they love
 * rather than its average.
 */
export function tasteBreadth(genreIds: readonly string[]): number {
  const picked = GENRES.filter((g) => genreIds.includes(g.id))
  if (picked.length < 2) return 0

  const avg = averageLeanings(genreIds)
  let total = 0
  for (const g of picked) {
    let d = 0
    for (const axis of AXIS_IDS) d += (g.axes[axis] - avg[axis]) ** 2
    total += Math.sqrt(d)
  }
  return total / picked.length
}
