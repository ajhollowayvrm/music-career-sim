/**
 * Checks that every hidden trait can still reach both extremes.
 *
 * Why this exists: the interview is the only thing that authors personality, so
 * if a trait can only move one way, a player who answers consistently against it
 * still reads back as its opposite — which quietly breaks "no right answers"
 * (§2). That is invisible in play, because pillar 2 hides the numbers: a
 * mis-tuned trait never shows up as a wrong value on screen, only as a world
 * that responds oddly. This is the check that catches it.
 *
 * It caught exactly that: at 7 questions, Integrity could only fall to 0.40 and
 * so could never read low.
 *
 * RUN IT whenever you add, cut, or retune a question:
 *
 *   npx -y esbuild tools/trait-range.ts --bundle --platform=node --format=esm \
 *     --outfile=/tmp/trait-range.mjs && node /tmp/trait-range.mjs
 *
 * esbuild is deliberately not a dependency (Vite 8 uses Rolldown and doesn't
 * ship it) — same reasoning as tools/make-icons.mjs: an ad-hoc tool shouldn't
 * cost CI an install on every build.
 *
 * Exits non-zero if any trait is unreachable at the tuned STEP.
 */

import { INTERVIEW } from '../src/game/interview.ts'
import { ORIGINS } from '../src/game/origins.ts'
import { TRAIT_IDS, type TraitId } from '../src/game/traits.ts'

// Keep in sync with traits.ts.
const BASELINE = 0.5
const STEP = 0.05
const HIGH = 0.72
const LOW = 0.28

const effectOn = (effects: object, id: TraitId): number =>
  (effects as Partial<Record<TraitId, number>>)[id] ?? 0

let failed = false
console.log(`\n  ${INTERVIEW.length} questions, STEP = ${STEP}\n`)

for (const id of TRAIT_IDS) {
  // The extremes: a player answering to push this trait as hard as it will go.
  let max = 0
  let min = 0
  for (const q of INTERVIEW) {
    const vals = q.answers.map((a) => effectOn(a.effects, id))
    max += Math.max(...vals)
    min += Math.min(...vals)
  }
  // Origins seed personality too — take the widest either way.
  const seeds = ORIGINS.map((o) => effectOn(o.seeds, id))
  const maxSum = max + Math.max(...seeds)
  const minSum = min + Math.min(...seeds)

  const hi = BASELINE + maxSum * STEP
  const lo = BASELINE + minSum * STEP
  const hiOk = hi >= HIGH
  const loOk = lo <= LOW
  if (!hiOk || !loOk) failed = true

  const flag = hiOk && loOk ? 'ok' : 'UNREACHABLE'
  console.log(
    `  ${id.padEnd(14)} sum ${String(minSum).padStart(3)}..${String(maxSum).padStart(3)}` +
      `  ->  ${lo.toFixed(2)}..${hi.toFixed(2)}` +
      `  high:${hiOk ? 'ok' : 'NO'} low:${loOk ? 'ok' : 'NO'}  ${flag}`,
  )
}

if (failed) {
  console.error(
    '\n  A trait cannot reach one of its extremes. Give it somewhere to move in\n' +
      '  the answers (preferred), or retune STEP in traits.ts.\n',
  )
  process.exit(1)
}
console.log('\n  Every trait can reach both extremes.\n')
