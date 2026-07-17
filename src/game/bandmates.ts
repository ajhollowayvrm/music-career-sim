/**
 * Bandmates — BRIEF §8.
 *
 * "Each bandmate is a full agent — 'basically another you', with fixed
 * personality, leanings, skill, and their own agenda."
 *
 * Taken literally: a bandmate has the same shape as the player. Fixed traits,
 * fixed leanings, talents, and — the part that makes them a person rather than a
 * stat block — an AGENDA they will act on whether or not it suits you.
 *
 * Their leanings matter as much as yours do. §3's genre mismatch cuts both ways:
 * writing music your guitarist has no feeling for costs you their respect, not
 * just your own happiness.
 */

import { AXIS_IDS, GENRES, type Leanings } from './genres.ts'
import { next, nextRange, type Rng } from './rng.ts'
import { emptySpread, MAX_TALENT_AT_CREATION, type TalentId, type TalentSpread } from './talents.ts'
import { TRAIT_IDS, clamp, type Traits } from './traits.ts'

/** What they're in it for. They will push for this, and resent not getting it. */
export type Agenda =
  | 'wants_to_play_out' // gig more
  | 'wants_the_work' // rehearse, get better, take it seriously
  | 'wants_a_say' // writing credit, their genre
  | 'wants_it_big' // reach, ambition, the deal
  | 'wants_the_hang' // it's about the people, not the career

export const AGENDA_BLURB: Readonly<Record<Agenda, string>> = {
  wants_to_play_out: 'is here to play live, as often as possible',
  wants_the_work: 'wants it taken seriously — rehearsed, tight, real',
  wants_a_say: 'wants their fingerprints on the songs',
  wants_it_big: 'wants this to go somewhere, and soon',
  wants_the_hang: 'is mostly here because they like being here',
}

export interface Bandmate {
  readonly id: number
  readonly name: string
  /** Their instrument — what they bring to a room. */
  readonly role: TalentId
  readonly roleLabel: string
  /** Fixed, exactly like the player's (§8: "basically another you"). */
  readonly traits: Traits
  readonly leanings: Leanings
  readonly talents: TalentSpread
  readonly agenda: Agenda
  /** §6: "A band can also leverage a member's following." */
  readonly following: number
}

const FIRST = [
  'Dana', 'Mo', 'Cal', 'Ruth', 'Jonah', 'Priya', 'Sam', 'Tess', 'Ike', 'Nell',
  'Rue', 'Ash', 'Bex', 'Otis', 'Marta', 'Kit', 'Dev', 'Joss', 'Lena', 'Fitz',
]
const LAST = [
  'Okafor', 'Brennan', 'Vance', 'Ryder', 'Salas', 'Doyle', 'Marsh', 'Quinn',
  'Alder', 'Novak', 'Vega', 'Byrne', 'Costa', 'Hale', 'Rossi', 'Teague',
]

const ROLES: ReadonlyArray<{ id: TalentId; label: string }> = [
  { id: 'guitar', label: 'guitar' },
  { id: 'bass', label: 'bass' },
  { id: 'drums', label: 'drums' },
  { id: 'keys', label: 'keys' },
  { id: 'voice', label: 'vocals' },
]

const pick = <T,>(items: readonly T[], rng: Rng): { value: T; rng: Rng } => {
  const r = nextRange(rng, 0, items.length)
  return { value: items[Math.floor(r.value)] ?? items[0]!, rng: r.rng }
}

/**
 * Makes a person. Traits and leanings are rolled and then frozen, same as the
 * player's — the whole point of §8 is that you're dealing with someone who
 * already is who they are.
 */
export function makeBandmate(id: number, rng: Rng): { mate: Bandmate; rng: Rng } {
  let r: Rng = rng

  const first = pick(FIRST, r)
  r = first.rng
  const last = pick(LAST, r)
  r = last.rng
  const role = pick(ROLES, r)
  r = role.rng
  const agenda = pick<Agenda>(
    ['wants_to_play_out', 'wants_the_work', 'wants_a_say', 'wants_it_big', 'wants_the_hang'],
    r,
  )
  r = agenda.rng

  const traits = {} as Record<string, number>
  for (const t of TRAIT_IDS) {
    const roll = nextRange(r, 0.15, 0.85)
    traits[t] = roll.value
    r = roll.rng
  }

  // Their taste is anchored on a genre they love, not scattered — a person has
  // a sound, not a random point in the space.
  const anchor = pick(GENRES, r)
  r = anchor.rng
  const leanings = {} as Record<string, number>
  for (const axis of AXIS_IDS) {
    const jitter = nextRange(r, -0.18, 0.18)
    leanings[axis] = clamp(anchor.value.axes[axis] + jitter.value, -1, 1)
    r = jitter.rng
  }

  const talents = emptySpread()
  // Strong on their instrument, thin everywhere else, with a little writing.
  const primary = nextRange(r, 2, MAX_TALENT_AT_CREATION + 0.99)
  r = primary.rng
  talents[role.value.id] = Math.floor(primary.value)
  for (const t of ['lyrics', 'creativity', 'composition'] as TalentId[]) {
    const roll = nextRange(r, 0, 3.99)
    talents[t] = Math.floor(roll.value)
    r = roll.rng
  }
  const stage = nextRange(r, 0, 3.99)
  talents.stagePresence = Math.floor(stage.value)
  r = stage.rng

  // Most players have nobody following them. A few turn up with a crowd.
  const fameRoll = next(r)
  r = fameRoll.rng
  let following = 0
  if (fameRoll.value > 0.82) {
    const amount = nextRange(r, 50, 900)
    following = Math.round(amount.value)
    r = amount.rng
  }

  return {
    mate: {
      id,
      name: `${first.value} ${last.value}`,
      role: role.value.id,
      roleLabel: role.value.label,
      traits: traits as unknown as Traits,
      leanings: leanings as unknown as Leanings,
      talents,
      agenda: agenda.value,
      following,
    },
    rng: r,
  }
}

/** A band's worth of strangers. */
export function makeBandmates(count: number, startId: number, rng: Rng): { mates: Bandmate[]; rng: Rng } {
  const mates: Bandmate[] = []
  let r = rng
  for (let i = 0; i < count; i++) {
    const made = makeBandmate(startId + i, r)
    mates.push(made.mate)
    r = made.rng
  }
  return { mates, rng: r }
}

/** How good they are at the thing they do. */
export const mateSkill = (mate: Bandmate): number => mate.talents[mate.role] / MAX_TALENT_AT_CREATION

/** Their writing chops, for the band's pooled ceiling (§7). */
export const mateWriting = (mate: Bandmate): number =>
  (mate.talents.lyrics * 0.35 + mate.talents.creativity * 0.35 + mate.talents.composition * 0.3) /
  MAX_TALENT_AT_CREATION
