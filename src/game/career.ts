/**
 * The macro ladder — BRIEF §17.
 *
 * The arc above the daily loops: the rungs, the milestones, the several
 * definitions of "making it", and how a run ends. Everything here READS the
 * accumulated state that the other systems built — it owns almost no numbers of
 * its own, because §17 is the shape you can only see from a distance once the
 * rest exists. That's why it's built last.
 *
 * HOW A RUN ENDS (§17). A run ends when you choose to retire, or automatically at
 * 95. Going broke (§12's eviction) is only the worst door. The endings here are
 * BUILD-DEPENDENT AND PLURAL — the Scene Legend, the Stadium Star, the
 * Benefactor, a burnout, a quiet fade, the comeback — and which one you get is
 * the whole run said back to you. "Your character has a win condition that fits
 * who you are."
 *
 * REBRANDS (§17), distinct from the fixed inner self (§3): you can reinvent the
 * outward name and image. The cost scales with fame — early it barely matters,
 * but rebranding once you're known destroys recognition and costs Following.
 *
 * PARKED, per §18's open threads, and deliberately not faked here:
 *   - The Benefactor MANAGEMENT layer (running the label and festival hands-on,
 *     §18.3). Benefactor is reachable here as the mogul ENDING and a milestone;
 *     the playable patron sim is its own future build.
 *   - Collabs and artist RELATIONSHIPS as a sub-system (§18.2). The light verb —
 *     a feature offer — already lives in §16's events; the deep relationship
 *     arcs are parked.
 */

import { clamp } from './traits.ts'

/** You start young and hungry. §17: a run auto-ends at 95. */
export const STARTING_AGE = 20
export const MAX_AGE = 95
const WEEKS_PER_YEAR = 52

/** Your age this week — a year every 52 weeks. */
export const ageForWeek = (week: number): number =>
  STARTING_AGE + Math.floor((week - 1) / WEEKS_PER_YEAR)

/** True once age forces the curtain down (§17). */
export const forcedRetirement = (week: number): boolean => ageForWeek(week) >= MAX_AGE

/* -------------------------------------------------------------------------- */
/* Rebrands                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What a rebrand costs you in Following — recognition thrown away. Below a small
 * following it's free: nobody knew the old name to forget it. Past that it bites,
 * and bites harder the bigger you are, exactly as §17 says.
 */
export function rebrandCost(following: number): number {
  if (following < 800) return 0
  const factor = 0.15 + clamp(following / 40_000, 0, 0.25)
  return Math.round(following * factor)
}

/* -------------------------------------------------------------------------- */
/* Milestones — the rungs, derived from where you've got to                    */
/* -------------------------------------------------------------------------- */

export interface MilestoneView {
  readonly reached: boolean
  readonly label: string
}

/** Following rungs a career climbs through — the visible ladder. */
const FOLLOWING_RUNGS: ReadonlyArray<{ at: number; label: string }> = [
  { at: 100, label: 'A hundred people know your name' },
  { at: 1000, label: 'A thousand following' },
  { at: 10_000, label: 'Ten thousand — you are somebody now' },
  { at: 100_000, label: 'A hundred thousand — the big time' },
]

export interface CareerFacts {
  readonly following: number
  readonly cred: number
  readonly releasedSongs: number
  readonly hasBand: boolean
  readonly awardsWon: number
  readonly recovered: boolean
  readonly playedGig: boolean
}

/** The milestone list for the career view — reached and not-yet, in order. */
export function milestones(f: CareerFacts): MilestoneView[] {
  const out: MilestoneView[] = [
    { reached: f.releasedSongs > 0, label: 'Put a song out into the world' },
    { reached: f.playedGig, label: 'Played a room' },
    { reached: f.hasBand, label: 'Stood on a stage with a band' },
  ]
  for (const rung of FOLLOWING_RUNGS) {
    out.push({ reached: f.following >= rung.at, label: rung.label })
  }
  out.push({ reached: f.cred >= 0.7, label: 'The scene points to you' })
  out.push({ reached: f.awardsWon > 0, label: 'Won an award' })
  if (f.recovered) out.push({ reached: true, label: 'Came back from the bottom' })
  out.push({ reached: benefactorEligible(f), label: 'Could become a Benefactor' })
  return out
}

/**
 * The top of the ladder — §17's Benefactor turn, where the climber becomes the
 * patron. The gate is being genuinely made: real reach, real standing, and the
 * capital to back other people.
 */
export function benefactorEligible(f: Pick<CareerFacts, 'following' | 'cred'> & { money?: number }): boolean {
  return f.following >= 8000 && f.cred >= 0.4
}

/* -------------------------------------------------------------------------- */
/* Endings — the run said back to you                                          */
/* -------------------------------------------------------------------------- */

export type EndingKind =
  | 'benefactor'
  | 'stadium_star'
  | 'scene_legend'
  | 'comeback'
  | 'burnout'
  | 'quiet_fade'

export interface Ending {
  readonly kind: EndingKind
  readonly title: string
  readonly prose: string
}

export interface EndingFacts {
  readonly following: number
  readonly cred: number
  readonly money: number
  readonly strain: number
  readonly recovered: boolean
  readonly moodLow: boolean
  readonly age: number
  readonly retiredByChoice: boolean
}

/**
 * Which ending fits this run. Order is priority: the biggest arcs first, then
 * the character pieces, then the quiet default. Build-dependent and plural, per
 * §17 — nobody gets told there was a "right" way to have done it.
 */
export function evaluateEnding(f: EndingFacts): Ending {
  // The mogul arc — you became the ladder.
  if (f.following >= 8000 && f.cred >= 0.4 && f.money >= 5000) {
    return {
      kind: 'benefactor',
      title: 'The Benefactor',
      prose:
        'You stopped climbing and started building. Your own label, your own festival, your name on the cheque instead of the poster — and a roster of people you lifted up behind you. The climber became the ladder.',
    }
  }
  // The mainstream, ambitious ending.
  if (f.following >= 8000) {
    return {
      kind: 'stadium_star',
      title: 'The Stadium Star',
      prose:
        'You wanted the big rooms and you filled them. Hundreds of thousands know your name, and the sound of them singing it back is a thing most people only imagine. You paid for it in the ways you knew you would, and you would do it again.',
    }
  }
  // The purist ending — monster Cred, a devoted few.
  if (f.cred >= 0.7) {
    return {
      kind: 'scene_legend',
      title: 'The Scene Legend',
      prose:
        'You never went massive, and you never sold a thing you did not mean. The people who know, know — and to them you are one of the ones it all runs through. A small, devoted, unshakeable following, and a name the scene says with respect.',
    }
  }
  // Recovered and still standing — the return was the story.
  if (f.recovered && (f.following > 800 || f.cred > 0.35)) {
    return {
      kind: 'comeback',
      title: 'The Comeback',
      prose:
        'You went all the way down, and you came back, and you kept going. Whatever else the run was, it was that — the fall and the return — and everyone who was there for it knows what it cost and what it took.',
    }
  }
  // Walked away wrecked.
  if (f.strain >= 0.55 || f.moodLow) {
    return {
      kind: 'burnout',
      title: 'The Burnout',
      prose:
        'You gave it everything until there was nothing left to give, and then you stopped. Not with a final show or a last record — you just could not do it any more. There is no shame in it. It takes more than most people have to have gone as far as you did.',
    }
  }
  // The quiet, honest default.
  return {
    kind: 'quiet_fade',
    title: 'The Quiet Fade',
    prose:
      'It never quite caught, and one day you noticed you had not picked it up in a while. No big ending, no bitterness — just a life that had music in it for a good long stretch, and then went somewhere else. Most of them end this way. It was still worth doing.',
  }
}
