import { isBurntOut } from '../../game/week.ts'
import { weekEarnings, type LoopState } from '../../game/loop.ts'

interface Props {
  state: LoopState
  onNext: () => void
}

/**
 * The week, closed out — BRIEF §5 and §12's lumpy-income squeeze.
 *
 * Money is the one number the player is allowed to see: §12 makes it the
 * game-over factor, so it has to be countable. Everything else stays felt.
 */
export default function WeekSummary({ state, onNext }: Props) {
  const earned = weekEarnings(state)
  const net = earned - state.lastCostOfLiving
  const burntDays = state.days.filter((d) => d.burntOut).length
  const goodDays = state.days.filter((d) => d.band === 'good').length

  return (
    <div className="summary">
      <h2 className="step-title">Week {state.week} is over</h2>

      <div className="ledger">
        <p className="ledger-row">
          <span>Earned</span>
          <span className="ledger-in">+£{earned}</span>
        </p>
        <p className="ledger-row">
          <span>Rent &amp; living</span>
          <span className="ledger-out">−£{state.lastCostOfLiving}</span>
        </p>
        <p className={`ledger-row is-net${net < 0 ? ' is-down' : ''}`}>
          <span>{net < 0 ? 'Down' : 'Up'} on the week</span>
          <span>
            {net < 0 ? '−' : '+'}£{Math.abs(net)}
          </span>
        </p>
        <p className="ledger-total">
          <span>In your account</span>
          <span className={state.money < 0 ? 'is-broke' : ''}>£{state.money}</span>
        </p>
      </div>

      <p className="summary-read">{readOfWeek(state, burntDays, goodDays, net)}</p>

      <div className="resolve-actions">
        <button type="button" className="btn btn-primary btn-grow" onClick={onNext}>
          Plan week {state.week + 1}
        </button>
      </div>
    </div>
  )
}

/** Prose, not a scorecard. The week's shape said back to you. */
function readOfWeek(state: LoopState, burntDays: number, goodDays: number, net: number): string {
  if (burntDays >= 4) {
    return 'You spent most of that week running on empty, and none of it was any good. That is not a schedule you can keep.'
  }
  if (burntDays > 0) {
    return `You pushed past what you had for ${burntDays} ${burntDays === 1 ? 'day' : 'days'} of it, and those days were wasted. Something has to give.`
  }
  if (state.money < 0) {
    return 'You are in the red. The music does not care, but the landlord will.'
  }
  if (net < 0 && goodDays > 0) {
    return 'A good week for the work, a bad one for the bank. You cannot do many more of those in a row.'
  }
  if (goodDays >= 3) {
    return 'That was a good week. Rare, and worth noticing.'
  }
  if (isBurntOut(state.energy)) {
    return 'You got through it, but you have nothing left. Next week should be quieter.'
  }
  return 'A week. It went. Some of it was even useful.'
}
