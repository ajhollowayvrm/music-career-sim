/**
 * The hidden trait layer — BRIEF §3.
 *
 * These are the slow, FIXED part of the character. They are authored once by the
 * interview (§2) and never change for the rest of the run; the brief is explicit
 * that the core inner self stays fixed and that only the relationship to
 * performing is allowed to move.
 *
 * Nothing in here may ever be rendered as a number. Pillar 2 — "numbers are felt,
 * not shown" — is the reason these are hidden, and the reason the interview
 * reports back in prose instead of a stat block.
 */

export type TraitId =
  // Self (§3) — these filter self-perception.
  | 'confidence'
  | 'discipline'
  | 'integrity'
  | 'ambition'
  // Others / the world (§3) — these filter how you read other people's intentions.
  | 'warmth'
  | 'industryTrust'

export const TRAIT_IDS: readonly TraitId[] = [
  'confidence',
  'discipline',
  'integrity',
  'ambition',
  'warmth',
  'industryTrust',
]

/** Every trait, 0..1. Hidden from the player forever. */
export type Traits = Readonly<Record<TraitId, number>>

/** Signed nudges an answer or an origin applies. Roughly -2..+2 per trait. */
export type TraitEffects = Partial<Readonly<Record<TraitId, number>>>

/** Everyone starts dead centre; the interview is what moves them. */
const BASELINE = 0.5

/**
 * How far one point of effect moves a trait. Tuned so a player who answers
 * consistently in one direction lands near — but not at — an extreme: the
 * interview should produce a person, not a maxed-out build.
 *
 * This is coupled to how many questions the interview has and to how the answer
 * effects are spread. Change either and a trait can silently become unable to
 * reach an extreme — which never shows up in play, because pillar 2 hides the
 * numbers. `tools/trait-range.ts` is the check; run it after any such change.
 */
const STEP = 0.05

/** Nobody is ever wholly without a trait, or wholly defined by one. */
const FLOOR = 0.05
const CEILING = 0.95

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n))

/** Sums a pile of effects onto the baseline and clamps into range. */
export function resolveTraits(effects: readonly TraitEffects[]): Traits {
  const totals = {} as Record<TraitId, number>
  for (const id of TRAIT_IDS) totals[id] = 0

  for (const effect of effects) {
    for (const id of TRAIT_IDS) {
      totals[id] += effect[id] ?? 0
    }
  }

  const traits = {} as Record<TraitId, number>
  for (const id of TRAIT_IDS) {
    traits[id] = clamp(BASELINE + totals[id] * STEP, FLOOR, CEILING)
  }
  return traits
}

/**
 * The only sanctioned way to surface a trait: as a word, in prose, and only
 * where the fiction earns it. Returns null in the broad middle, because most
 * people are unremarkable on most axes and claiming otherwise is noise.
 */
export function describeTrait(id: TraitId, value: number): string | null {
  const high = value >= 0.72
  const low = value <= 0.28
  if (!high && !low) return null

  const words: Record<TraitId, readonly [low: string, high: string]> = {
    confidence: ['carries doubt onto the stage', 'walks on like the room is already yours'],
    discipline: ['works in bursts, when it takes you', 'shows up whether or not it feels good'],
    integrity: ['bends when bending is useful', "won't move on the things that matter"],
    ambition: ['wants a life more than a career', 'wants it, and not quietly'],
    warmth: ["keeps people at arm's length", 'people find their way to you'],
    industryTrust: ['reads a contract like a threat', 'believes people mean what they offer'],
  }

  const pair = words[id]
  return high ? pair[1] : pair[0]
}
