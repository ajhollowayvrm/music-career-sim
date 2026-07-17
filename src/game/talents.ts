/**
 * Talent — BRIEF §2 and §3.
 *
 * Talent is LEARNABLE skill, and the brief keeps it strictly separate from taste
 * (leanings, see genres.ts) and from temperament (traits.ts). Unlike traits,
 * talent is allowed to grow over a career.
 *
 * §2 is emphatic that LYRICS and CREATIVITY are their own dimensions, distinct
 * from instruments and from general composition, because they drive song quality
 * and originality more than raw playing does. That's what makes a strong-lyrics,
 * strong-creativity, mid-instrument build a real singer-songwriter whose songs
 * carry the weight rather than the chops — so they lead the list.
 */

export type TalentId =
  | 'lyrics'
  | 'creativity'
  | 'composition'
  | 'production'
  | 'voice'
  | 'guitar'
  | 'keys'
  | 'drums'
  | 'bass'
  | 'stagePresence'

export interface Talent {
  readonly id: TalentId
  readonly label: string
  /** Shown at creation. Says what the talent *does*, never what it's worth. */
  readonly blurb: string
  readonly group: 'The songs' | 'The playing' | 'The room'
}

export const TALENTS: readonly Talent[] = [
  {
    id: 'lyrics',
    label: 'Lyrics',
    blurb: 'The words. What the song is actually about, and whether it lands.',
    group: 'The songs',
  },
  {
    id: 'creativity',
    label: 'Creativity',
    blurb: "Originality. Whether it sounds like you, or like what's already out.",
    group: 'The songs',
  },
  {
    id: 'composition',
    label: 'Composition',
    blurb: 'Structure, melody, arrangement. How the thing is built.',
    group: 'The songs',
  },
  {
    id: 'production',
    label: 'Production',
    blurb: 'Recording and mixing. How it sounds coming out of a speaker.',
    group: 'The songs',
  },
  { id: 'voice', label: 'Voice', blurb: 'Singing. Range, control, and character.', group: 'The playing' },
  { id: 'guitar', label: 'Guitar', blurb: 'Electric and acoustic.', group: 'The playing' },
  { id: 'keys', label: 'Keys', blurb: 'Piano, organ, synths.', group: 'The playing' },
  { id: 'drums', label: 'Drums', blurb: 'Kit and percussion.', group: 'The playing' },
  { id: 'bass', label: 'Bass', blurb: 'The floor everything else stands on.', group: 'The playing' },
  {
    id: 'stagePresence',
    label: 'Stage Presence',
    // Every blurb here is player-facing. Brief section refs belong in comments,
    // not in copy — §9 is where "skill carries a show, not gear" comes from.
    blurb: 'Holding a room that came to see someone else.',
    group: 'The room',
  },
]

export const TALENT_IDS: readonly TalentId[] = TALENTS.map((t) => t.id)

export type TalentSpread = Readonly<Record<TalentId, number>>

/** Per-talent ceiling at creation. You start a musician, not a master. */
export const MAX_TALENT_AT_CREATION = 5

/** Points the player distributes on top of whatever their origin seeded. */
export const POINTS_TO_SPEND = 10

export const emptySpread = (): Record<TalentId, number> => {
  const spread = {} as Record<TalentId, number>
  for (const id of TALENT_IDS) spread[id] = 0
  return spread
}

export const spentPoints = (spread: TalentSpread, base: TalentSpread): number =>
  TALENT_IDS.reduce((sum, id) => sum + (spread[id] - base[id]), 0)

/**
 * Pips, not digits. §2 asks for a point-spend here, so allocation is visible at
 * creation — but the brief also says creation must never feel like filling out a
 * form, so it reads as a row of dots rather than a spreadsheet cell. After
 * creation this number is never shown again (pillar 2).
 */
export const pips = (value: number, max = MAX_TALENT_AT_CREATION): string =>
  '●'.repeat(value) + '○'.repeat(Math.max(0, max - value))
