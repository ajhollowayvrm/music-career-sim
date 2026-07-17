/**
 * Origins — BRIEF §2.
 *
 * "A story, not a class." Three rules from the brief, all load-bearing:
 *
 *  1. An origin NEVER locks talents. A church-choir kid can still become a
 *     guitar monster. Origins seed a head-start; they close no doors.
 *  2. Each hands over a keepsake with a REAL gameplay benefit — never pure
 *     flavor. The `benefit` field is the promise; the systems that honor it
 *     don't exist yet, so each one names the section that will owe it.
 *  3. Each QUIETLY seeds personality. The player is never told which traits
 *     moved, which is why `seeds` is not surfaced anywhere in the UI.
 *
 * These four are the ones the brief names. It calls them "example origins", so
 * more are expected — adding one is just another entry here. Deliberately not
 * inventing extras: origins are design, and design is AJ's.
 */

import type { TraitEffects } from './traits.ts'
import type { TalentId } from './talents.ts'

export type OriginId = 'choir_kid' | 'garage_self_taught' | 'bedroom_producer' | 'open_mic_lifer'

export interface Keepsake {
  readonly name: string
  /** Prose the player reads. */
  readonly description: string
  /** The mechanical promise. Never "it's just flavor" — §2 forbids that. */
  readonly benefit: string
  /** Which brief section will have to make good on `benefit`. */
  readonly owedBy: string
}

export interface Origin {
  readonly id: OriginId
  readonly label: string
  /** Second person, past tense. This is a story the player recognizes. */
  readonly story: string
  readonly keepsake: Keepsake
  /** The talent head-start. Never a lock — §2. */
  readonly talentHeadStart: Partial<Readonly<Record<TalentId, number>>>
  /** Quietly seeded personality. Never shown. */
  readonly seeds: TraitEffects
}

export const ORIGINS: readonly Origin[] = [
  {
    id: 'choir_kid',
    label: 'The choir kid',
    story:
      'You learned to sing in a room full of people singing. You could find a harmony before you could read music, and you never once did it alone.',
    keepsake: {
      name: "Grandmother's hymnal",
      description:
        'Soft-backed, falling apart, annotated in a hand you would know anywhere. You do not play from it. You keep it.',
      benefit: 'An edge on harmony and writing, and an anchor that steadies your morale on bad days.',
      owedBy: '§7 Songwriting, §3 Mood',
    },
    talentHeadStart: { voice: 2, composition: 1, lyrics: 1 },
    seeds: { warmth: 2, discipline: 1, integrity: 1 },
  },
  {
    id: 'garage_self_taught',
    label: 'The garage self-taught',
    story:
      'Nobody taught you. You worked it out from records, badly, loudly, in a garage that was too cold half the year. What you lack in theory you make up for in not caring that you lack it.',
    keepsake: {
      name: 'Pawn-shop guitar',
      description:
        'Free, because nobody else wanted it. It buzzes on the low E and the tuners slip. It is yours and it works.',
      benefit: 'You can gig and record from day one — no instrument to buy first.',
      owedBy: '§9 Live Gigs, §10 Gear',
    },
    talentHeadStart: { guitar: 2, creativity: 1, stagePresence: 1 },
    seeds: { confidence: 1, integrity: 1, industryTrust: -1 },
  },
  {
    id: 'bedroom_producer',
    label: 'The bedroom producer',
    story:
      'You have never played a room, but you have finished a hundred songs. You learned the craft alone, at night, in headphones, one bounced mix at a time.',
    keepsake: {
      name: 'Cracked laptop',
      description:
        'The hinge is taped. The fan screams. Every session you have ever made is on it, and it has not failed you yet.',
      benefit: 'The recording and creator paths are open to you immediately.',
      owedBy: '§6 Solo/Creator, §7 Production',
    },
    talentHeadStart: { production: 2, composition: 1, creativity: 1 },
    seeds: { discipline: 2, confidence: -1, ambition: 1 },
  },
  {
    id: 'open_mic_lifer',
    label: 'The open-mic lifer',
    story:
      'Years of Tuesday nights, three songs a time, to eleven people and a bartender who was not listening. You have died on stage so many times it stopped being able to kill you.',
    keepsake: {
      name: 'Road-worn acoustic',
      description:
        'The finish is gone where your arm sits. It has been to every bad room in the city and it sounds better for it.',
      benefit: 'An edge on stage presence — you already know how to hold a room that is not listening.',
      owedBy: '§9 Live Gigs',
    },
    talentHeadStart: { stagePresence: 2, voice: 1, lyrics: 1 },
    seeds: { confidence: 2, discipline: 1, ambition: -1 },
  },
]

export const originById = (id: OriginId): Origin => {
  const found = ORIGINS.find((o) => o.id === id)
  if (!found) throw new Error(`Unknown origin: ${id}`)
  return found
}
