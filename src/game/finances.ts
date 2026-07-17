/**
 * Finances & the fail state — BRIEF §12.
 *
 * "Money is the game-over factor: failing to make rent is how you lose." This is
 * the module that finally makes the £200 the week already takes matter — until
 * now going into the red was a scolding line in the summary and nothing else.
 *
 * THE CADENCE STAYS WEEKLY, ON PURPOSE. §12 talks in months ("bills that hit
 * every month", "one grace month"), but the loop settles weekly and the whole
 * energy/mood/money balance is tuned against a £200-a-week drain that
 * tools/week-balance.ts gates. Reflowing rent into a monthly lump would force a
 * re-tune of a play-tested loop to buy nothing the player can feel. So rent is
 * still the weekly cost of living (loop.ts owns the number), and "the month" is
 * the length of the grace window — which is exactly the part §12 actually
 * mechanises.
 *
 * THE CLIFF HAS ONE STEP OF GRACE (§12). Fall into the red and the landlord
 * serves notice: you get a month to make it right. Claw back to solvent inside
 * the window and it clears. Let the window run out still underwater and it's
 * eviction — the run ends.
 *
 * Eviction is THE WORST DOOR, not the only one. §12: "Going broke is only the
 * worst door." The plural, build-dependent endings — the Scene Legend, the
 * Stadium Star, retiring on your own terms — are §17's, and this module knows
 * only about the one you don't choose.
 *
 * DELIBERATELY NOT HERE, because §12 hands them to sections not built yet:
 *   - The label advance as a loan against a sales target. There are no labels
 *     yet (§17's macro ladder owns signing), so there's no advance to recoup.
 *   - The liquidation ladder — selling possessions to make rent — is the buffer
 *     §12 points at, and it's §11's to build. This module just makes the cliff
 *     it buffers against real.
 *   - City as flavour, not a money lever: nothing to implement, by design.
 */

/**
 * The grace window, in weeks — §12's "one grace month". Fall behind and this
 * many weeks pass before the door: the week you miss serves notice, and each
 * further week still in the red spends one, so you go under water for about a
 * month before you're out. Long enough that a good gig or a fire sale (§11) can
 * save you; short enough that ignoring it can't.
 */
export const GRACE_WEEKS = 3

/**
 * What rent did to you this week — the single fact the summary needs to speak.
 * 'none' is the ordinary solvent week that says nothing about rent at all.
 */
export type RentEvent = 'none' | 'fell_behind' | 'still_behind' | 'caught_up' | 'evicted'

export interface RentAssessment {
  /** Weeks of grace remaining. 0 = square with the landlord. */
  readonly graceWeeksLeft: number
  readonly event: RentEvent
}

/**
 * The week's rent, assessed against the account after the bills have landed.
 * Pure: same money and grace in, same verdict out — the reducer keeps the number
 * and the UI reads the event.
 *
 * Being at exactly £0 is square, not behind: you scraped it. Only a negative
 * balance is a missed rent.
 */
export function assessRent(money: number, graceWeeksLeft: number): RentAssessment {
  const behind = money < 0

  if (!behind) {
    // Made it. If you'd been on notice, the notice lifts.
    return { graceWeeksLeft: 0, event: graceWeeksLeft > 0 ? 'caught_up' : 'none' }
  }

  // First week under water: notice served, the month begins.
  if (graceWeeksLeft === 0) {
    return { graceWeeksLeft: GRACE_WEEKS, event: 'fell_behind' }
  }

  // Already on notice and still short — a week of the month gone.
  const left = graceWeeksLeft - 1
  if (left <= 0) return { graceWeeksLeft: 0, event: 'evicted' }
  return { graceWeeksLeft: left, event: 'still_behind' }
}

/** True when the run is over because rent ran out. */
export const isEvicted = (event: RentEvent): boolean => event === 'evicted'

/**
 * The landlord, in the game's voice — the standing warning while you're behind,
 * so the pressure lives on screen and not just in the week you slipped.
 * Returns null when you're square, because a paid-up tenant hears nothing.
 */
export function describeRent(graceWeeksLeft: number): string | null {
  if (graceWeeksLeft <= 0) return null
  const weeks = graceWeeksLeft === 1 ? 'a week' : `${graceWeeksLeft} weeks`
  return `Rent's overdue. He'll give you ${weeks} to make it right.`
}

/** The line the week's ledger closes on, when rent did something worth saying. */
export function rentEventLine(event: RentEvent, graceWeeksLeft: number): string | null {
  switch (event) {
    case 'fell_behind':
      return "You couldn't cover rent. He hasn't changed the locks — yet. You have to the end of the month."
    case 'still_behind': {
      const weeks = graceWeeksLeft === 1 ? 'A week' : `${graceWeeksLeft} weeks`
      return `Still behind on rent. ${weeks} left before he stops being patient.`
    }
    case 'caught_up':
      return "You're square with the landlord again. That was closer than you'd like."
    case 'evicted':
    case 'none':
      return null
  }
}
