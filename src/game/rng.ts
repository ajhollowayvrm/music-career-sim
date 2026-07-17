/**
 * Seeded RNG (mulberry32).
 *
 * Deliberately not Math.random: a career sim wants reproducible runs. A seed in
 * the state means the same week resolves the same way, which makes a bug
 * re-playable and lets a save store the seed rather than every rolled outcome.
 *
 * The generator is a plain number, so it stays serializable like everything else
 * in game state (README "Known gaps").
 */

export interface Rng {
  /** Next float in [0, 1), and the seed to carry forward. */
  readonly seed: number
}

export const makeRng = (seed: number): Rng => ({ seed: seed >>> 0 })

/** Returns the value and the next Rng — pure, no hidden mutation. */
export function next(rng: Rng): { value: number; rng: Rng } {
  let t = (rng.seed + 0x6d2b79f5) >>> 0
  let x = Math.imul(t ^ (t >>> 15), 1 | t)
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296
  return { value, rng: { seed: t } }
}

/** Float in [min, max). */
export function nextRange(rng: Rng, min: number, max: number): { value: number; rng: Rng } {
  const r = next(rng)
  return { value: min + r.value * (max - min), rng: r.rng }
}
