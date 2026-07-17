/**
 * Plays canned weeks and prints what four weeks of each does to you.
 *
 * Why this exists: §5's whole claim is that planning a week is a real decision,
 * and that only holds if no plan is a free win. Pillar 2 hides energy, mood and
 * quality behind prose, so a loop that has quietly become solvable looks exactly
 * like one that hasn't. Eyeballing the constants does not work — this probe
 * caught, in order: five action days ending every week at full energy (no cost
 * at all), mood ratcheting to 100 and pinning, every day landing in the middle
 * band so the self-perception filter never fired, and a mood death-spiral with
 * no way back.
 *
 * RUN IT after touching energy/mood/quality constants in week.ts or resolve.ts:
 *
 *   npx -y esbuild tools/week-balance.ts --bundle --platform=node --format=esm \
 *     --outfile=/tmp/week-balance.mjs && node /tmp/week-balance.mjs
 *
 * The archetype table is a read, not a gate. What you want to see:
 *   - no plan that is comfortable AND solvent AND rising in mood
 *   - the solvent plan (3 shifts) visibly grinding energy and mood down
 *   - all three bands (g/o/b) appearing, or the perception filter is wasted
 *   - burnout arriving at six action days, not at four
 *
 * The invariant check at the bottom IS a gate, and exits non-zero. It asserts
 * that the board's burnout warning equals what the week actually does — they're
 * computed in different places (week.ts projects, resolve.ts judges) and drifted
 * apart once already: the board counted days ENDING in the red, the sim burns
 * days STARTING in the red, so the warning over-reported by one. A planning
 * surface that lies about the plan is worse than no planning surface.
 */

import { finalizeCharacter } from '../src/game/character.ts'
import { COST_OF_LIVING, initialLoopState, loopReducer, type LoopState } from '../src/game/loop.ts'
import type { RouteId } from '../src/game/routes.ts'
import { burnoutDays } from '../src/game/week.ts'

// A middling musician: some talent, nothing exceptional.
const character = finalizeCharacter({
  realName: 'Sim',
  stageName: '',
  originId: 'garage_self_taught',
  answers: {},
  genreIds: ['punk'],
  talents: {
    lyrics: 2, creativity: 2, composition: 1, production: 0, voice: 0,
    guitar: 3, keys: 0, drums: 0, bass: 0, stagePresence: 2,
  },
})

/**
 * Songs matter to this probe now (§7): a 'make music' day with an empty bench is
 * a WASTED day, and a day on a song you love swings mood far harder than the
 * flat route value. Without a song on the bench these archetypes would quietly
 * be measuring nothing happening.
 *
 * 'punk' matches the character's leanings, so this measures the good case —
 * someone writing music they actually love.
 */
const withSong = (state: LoopState): LoopState =>
  loopReducer(state, { type: 'startSong', title: 'Probe', genreId: 'punk', themes: [] })

const playWeek = (state: LoopState, plan: (RouteId | null)[]): LoopState => {
  let s = state
  // Keep something on the bench so make_music days do real work.
  if (!s.songs.some((song) => song.phase !== 'released')) s = withSong(s)
  plan.forEach((r, i) => {
    s = loopReducer(s, { type: 'setDay', dayIndex: i, routeId: r })
  })
  s = loopReducer(s, { type: 'playWeek' })
  for (let i = 0; i < 7; i++) s = loopReducer(s, { type: 'advanceDay', character })
  // finishWeek is separate from the last advanceDay so the player gets to read
  // Sunday. It's also where the bills and the catalog land, so skipping it here
  // would quietly measure a week that never paid rent.
  s = loopReducer(s, { type: 'finishWeek' })
  return s
}

const M: RouteId = 'make_music'
const J: RouteId = 'day_job'
const Z: RouteId = 'rest'

const ARCHETYPES: Array<[string, (RouteId | null)[]]> = [
  ['7 action days, all music', [M, M, M, M, M, M, M]],
  ['6 action + 1 rest', [M, M, M, J, J, M, Z]],
  ['5 action + 2 rest (music first)', [M, M, J, J, J, Z, Z]],
  ['5 action + 2 rest (shifts first)', [J, J, J, M, M, Z, Z]],
  ['4 action + 3 rest', [M, M, J, J, Z, Z, Z]],
  ['nothing but rest', [Z, Z, Z, Z, Z, Z, Z]],
]

for (const [name, plan] of ARCHETYPES) {
  let s = initialLoopState(12345)
  console.log(`\n  ${name}`)
  for (let w = 0; w < 4; w++) {
    s = playWeek(s, plan)
    const burnt = s.days.filter((d) => d.burntOut).length
    const bands = s.days.map((d) => d.band[0]).join('')
    console.log(
      `    w${w + 1}  energy ${String(Math.round(s.energy)).padStart(3)}` +
        `  mood ${String(Math.round(s.mood)).padStart(3)}` +
        `  money ${String(s.money).padStart(5)}` +
        `  burnt ${burnt}/7  ${bands}` +
        (s.graceWeeksLeft > 0 ? `  overdue(${s.graceWeeksLeft})` : ''),
    )
    // §12: if rent ran out mid-probe the reducer is now frozen in 'gameover',
    // and the frozen no-op weeks after it are noise. None of the archetypes
    // should evict inside four weeks — the grace month outlasts the horizon — so
    // this is a backstop that surfaces the fail state rather than hiding it.
    if (s.phase === 'gameover') {
      console.log('    evicted — run ended')
      break
    }
    s = loopReducer(s, { type: 'nextWeek' })
  }
}

console.log(`\n  cost of living ${COST_OF_LIVING}/wk · bands: g=good o=ok b=bad`)

/* -------------------------------------------------------------------------- */
/* Gate: the board must not lie about the plan.                                */
/* -------------------------------------------------------------------------- */

console.log('\n  Board warning vs what the week actually does\n')

let failures = 0
for (const [name, plan] of ARCHETYPES) {
  let s = initialLoopState(999)
  // Three weeks, so this runs from varied starting energy and not just full.
  for (let w = 1; w <= 3; w++) {
    const startEnergy = s.energy
    const predicted = burnoutDays(plan, startEnergy).length
    s = playWeek(s, plan)
    const actual = s.days.filter((d) => d.burntOut).length
    const ok = predicted === actual
    if (!ok) failures++
    console.log(
      `    ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(33)} w${w}` +
        ` start ${String(Math.round(startEnergy)).padStart(3)}` +
        `  board says ${predicted}  week burns ${actual}`,
    )
    // Don't assert on the frozen no-op weeks after an eviction (§12).
    if (s.phase === 'gameover') break
    s = loopReducer(s, { type: 'nextWeek' })
  }
}

if (failures) {
  console.error(`\n  ${failures} mismatch(es) — the board is lying about the plan.\n`)
  process.exit(1)
}
console.log('\n  Board matches the week in every case.\n')
