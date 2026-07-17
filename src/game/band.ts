/**
 * The band — BRIEF §8, "the richest system in the game".
 *
 * Three things this file exists to make true:
 *
 *  1. CHEMISTRY IS MULTI-FACETED. Not one bond bar. Musical respect, personal
 *     friendship and professional trust move INDEPENDENTLY, so "you can be loved
 *     and disrespected, or trusted by someone who can't stand you". Any
 *     temptation to average them into a single number is the section being
 *     deleted — the whole point is that people are not one number about you.
 *
 *  2. A BAD BAND IS A TRAP. Low chemistry doesn't just fail to help; it drags
 *     your songs BELOW what you'd have written alone. A band is only an upgrade
 *     when the chemistry is there, and joining a bad one has to be a real, costly
 *     mistake — otherwise "solo vs band" isn't a decision (§6).
 *
 *  3. LEADERSHIP IS EMERGENT. Founding buys you pull, it doesn't buy you the
 *     band. You can join and rise to lead it; you can found one and get pushed
 *     out on a relationship/reliability threshold.
 *
 * Chemistry is never shown as a number (pillar 2) — see describeMate.
 */

import type { Character } from './character.ts'
import { AXIS_IDS } from './genres.ts'
import { clamp } from './traits.ts'
import { compositionCeiling } from './songs.ts'
import { mateWriting, type Bandmate } from './bandmates.ts'

/**
 * §8's facets. Independent on purpose — do not collapse these.
 */
export interface Chemistry {
  /** Do they rate you as a musician? */
  readonly musicalRespect: number
  /** Do they actually like you? */
  readonly friendship: number
  /** Can they rely on you to turn up and do the work? */
  readonly professionalTrust: number
}

export interface Band {
  readonly name: string
  readonly members: readonly Bandmate[]
  /** Your chemistry with each member, keyed by member id. */
  readonly chemistry: Readonly<Record<number, Chemistry>>
  /** Your pull, 0..1. Founding starts it high; it is not fixed there (§8). */
  readonly standing: number
  readonly founded: boolean
  readonly weeksTogether: number
}

export const startingChemistry = (founded: boolean): Chemistry =>
  founded
    ? // They came to you. They start out willing.
      { musicalRespect: 0.5, friendship: 0.45, professionalTrust: 0.5 }
    : // You're the new one. You have not proved anything yet.
      { musicalRespect: 0.35, friendship: 0.3, professionalTrust: 0.35 }

/** §8: founding gives you "a lot more pull to begin with" — not ownership. */
export const startingStanding = (founded: boolean): number => (founded ? 0.7 : 0.25)

export const mateChemistry = (band: Band, id: number): Chemistry =>
  band.chemistry[id] ?? { musicalRespect: 0.5, friendship: 0.5, professionalTrust: 0.5 }

/** One member's overall warmth toward you. Only for internal maths — never shown. */
export const chemistryMean = (c: Chemistry): number =>
  (c.musicalRespect + c.friendship + c.professionalTrust) / 3

export const bandChemistry = (band: Band): number =>
  band.members.length === 0
    ? 0
    : band.members.reduce((sum, m) => sum + chemistryMean(mateChemistry(band, m.id)), 0) /
      band.members.length

/* -------------------------------------------------------------------------- */
/* The trap — §8, §7                                                          */
/* -------------------------------------------------------------------------- */

/**
 * How much the band multiplies (or wrecks) what you can write.
 *
 * Below 1 the band is actively worse than your bedroom. That is §8's trap stated
 * as a number: at rock-bottom chemistry you write at 62% of your solo ceiling —
 * stifled, arguing, second-guessed — and at real chemistry you write at 140% of
 * it. The crossover sits just under the middle, so a mediocre band is a mild
 * drag rather than neutral. Bands you don't fix are worth leaving.
 */
export function bandFactor(band: Band): number {
  return 0.62 + bandChemistry(band) * 0.78
}

/**
 * The band's writing ceiling — §7: "Band songwriting can be better than solo —
 * but only as good as your chemistry with the members."
 *
 * The pool is you plus them, weighted toward the best writer in the room (a band
 * writes up to its strongest, somewhat), then scaled by chemistry. So a band of
 * good writers you can't stand still writes worse than you alone.
 */
export function bandCompositionCeiling(character: Character, band: Band): number {
  const solo = compositionCeiling(character)
  if (band.members.length === 0) return solo

  const writers = [solo, ...band.members.map(mateWriting)]
  const best = Math.max(...writers)
  const mean = writers.reduce((a, b) => a + b, 0) / writers.length
  const pooled = best * 0.6 + mean * 0.4

  return clamp(pooled * bandFactor(band), 0.1, 0.98)
}

/**
 * Whether being in this band is currently helping you write at all.
 * The honest answer the player deserves before they waste six months.
 */
export const bandIsHelping = (character: Character, band: Band): boolean =>
  bandCompositionCeiling(character, band) > compositionCeiling(character)

/* -------------------------------------------------------------------------- */
/* Fit — their taste vs your songs                                            */
/* -------------------------------------------------------------------------- */

const MAX_DISTANCE = 2.5

/**
 * How close a member's taste is to a song's genre. §3's mismatch runs both ways:
 * you lose happiness writing music you don't love, and you lose a bandmate's
 * RESPECT writing music THEY don't love. A band of people who love different
 * things cannot make everyone happy, which is the point of them being people.
 */
export function mateFit(mate: Bandmate, songAxes: Record<string, number>): number {
  let sum = 0
  for (const axis of AXIS_IDS) sum += ((songAxes[axis] ?? 0) - mate.leanings[axis]) ** 2
  return clamp(1 - Math.sqrt(sum) / MAX_DISTANCE, 0, 1)
}

/* -------------------------------------------------------------------------- */
/* Moving chemistry                                                           */
/* -------------------------------------------------------------------------- */

export type ChemistryNudge = Partial<Chemistry>

export function nudge(c: Chemistry, delta: ChemistryNudge): Chemistry {
  return {
    musicalRespect: clamp(c.musicalRespect + (delta.musicalRespect ?? 0), 0, 1),
    friendship: clamp(c.friendship + (delta.friendship ?? 0), 0, 1),
    professionalTrust: clamp(c.professionalTrust + (delta.professionalTrust ?? 0), 0, 1),
  }
}

export function nudgeAll(band: Band, delta: ChemistryNudge): Band {
  const chemistry: Record<number, Chemistry> = {}
  for (const m of band.members) chemistry[m.id] = nudge(mateChemistry(band, m.id), delta)
  return { ...band, chemistry }
}

export function nudgeOne(band: Band, id: number, delta: ChemistryNudge): Band {
  return { ...band, chemistry: { ...band.chemistry, [id]: nudge(mateChemistry(band, id), delta) } }
}

/* -------------------------------------------------------------------------- */
/* Leaving and being left — §8                                                */
/* -------------------------------------------------------------------------- */

/**
 * §8: bad choices "can get you kicked out on a relationship/reliability
 * threshold". Reliability is the one that does it: people will carry someone
 * they don't like, but not someone who doesn't turn up.
 */
export const PUSHED_OUT_TRUST = 0.16
export const PUSHED_OUT_STANDING = 0.2

export function pushedOut(band: Band): boolean {
  if (band.members.length === 0) return false
  const trust = band.members.map((m) => mateChemistry(band, m.id).professionalTrust)
  const meanTrust = trust.reduce((a, b) => a + b, 0) / trust.length
  return meanTrust < PUSHED_OUT_TRUST && band.standing < PUSHED_OUT_STANDING
}

/** A member walks when there's nothing keeping them — not liked, not impressed. */
export function willQuit(band: Band, mate: Bandmate): boolean {
  const c = mateChemistry(band, mate.id)
  if (c.friendship > 0.25 || c.musicalRespect > 0.25) return false
  // Someone who wanted the hang leaves sooner; someone chasing it big hangs on
  // while it's still going somewhere.
  return mate.agenda !== 'wants_it_big' || band.standing < 0.4
}

/* -------------------------------------------------------------------------- */
/* Saying it out loud — pillar 2                                              */
/* -------------------------------------------------------------------------- */

const HIGH = 0.62
const LOW = 0.32

/**
 * A member's read on you, in prose.
 *
 * This is where §8's facets earn their keep: the interesting sentences are the
 * CONTRADICTIONS. "Rates you, can't stand you" is a real relationship, and a
 * single bond bar could never say it.
 */
export function describeMate(mate: Bandmate, c: Chemistry): string {
  const respect = c.musicalRespect >= HIGH ? 'high' : c.musicalRespect <= LOW ? 'low' : 'mid'
  const friend = c.friendship >= HIGH ? 'high' : c.friendship <= LOW ? 'low' : 'mid'
  const trust = c.professionalTrust >= HIGH ? 'high' : c.professionalTrust <= LOW ? 'low' : 'mid'
  const them = mate.name.split(' ')[0]

  if (respect === 'high' && friend === 'low')
    return `${them} thinks you are the real thing and would not cross the road for you.`
  if (respect === 'low' && friend === 'high')
    return `${them} likes you enormously and does not rate you at all.`
  if (trust === 'low' && friend === 'high')
    return `${them} is fond of you and has stopped expecting you to turn up.`
  if (trust === 'high' && friend === 'low')
    return `${them} can rely on you, and that is the whole of it.`
  if (respect === 'high' && friend === 'high' && trust === 'high')
    return `${them} is all in. You could ask them for anything.`
  if (respect === 'low' && friend === 'low' && trust === 'low')
    return `${them} is looking for the door.`
  if (respect === 'high') return `${them} rates you.`
  if (friend === 'high') return `${them} is glad you are here.`
  // Trust alone, with everything else middling, is the single most common state
  // in the game — it's what weeks of rehearsing buys. Without this line the
  // player does the right thing for a month and the room says nothing, because
  // it falls through to "still working you out" and pillar 2 means there's no
  // number to notice moving instead.
  if (trust === 'high') return `${them} knows you will be there. That counts for more than you think.`
  if (trust === 'low') return `${them} is not sure you are serious about this.`
  if (respect === 'low') return `${them} is not convinced by you.`
  return `${them} is still working you out.`
}

/** Your pull in the room, in prose. §8's emergent leadership, felt. */
export function describeStanding(band: Band): string {
  if (band.members.length === 0) return ''
  if (band.standing >= 0.75) return 'This is your band. Nobody argues with that.'
  if (band.standing >= 0.55) return 'When you say the word, it mostly goes your way.'
  if (band.standing >= 0.35) return 'You get a say. So does everyone.'
  if (band.standing >= 0.2) return 'You are in the band. You are not driving it.'
  return 'They are deciding things without you now.'
}

/**
 * Whether the band is worth being in, in prose. §8's trap, said plainly.
 *
 * Compares the REAL ceilings, not `bandFactor`. Those are different questions and
 * conflating them makes this line lie: the factor multiplies the pooled writing,
 * so a band of weak writers can sit at factor 1.13 and still leave you worse off
 * than your own bedroom. It told the player the band was helping while their
 * ceiling was 5% down — and pillar 2 means they'd never have seen the number to
 * catch it.
 */
export function describeBandWorth(character: Character, band: Band): string {
  if (band.members.length === 0) return ''
  const ratio = bandCompositionCeiling(character, band) / compositionCeiling(character)
  if (ratio >= 1.15) return 'Together you are better than any of you alone. That is rare — hold on to it.'
  if (ratio >= 1.02) return 'This band makes your songs better than you would make them by yourself.'
  if (ratio >= 0.96)
    return 'You are writing about as well as you would on your own. The band is not adding anything yet.'
  return 'You write worse in this room than you do alone. Something here is in the way.'
}
