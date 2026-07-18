import { isBurntOut } from '../../game/week.ts'
import { formatMoney, released, weekEarnings, type LoopState } from '../../game/loop.ts'
import { STARTING_CRED, describeCred, describeGap, formatFollowing } from '../../game/fame.ts'
import { rentEventLine } from '../../game/finances.ts'
import { GigSummary } from './GigNight.tsx'

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
  const net = earned + state.lastCatalogEarnings - state.lastCostOfLiving
  const burntDays = state.days.filter((d) => d.burntOut).length
  const goodDays = state.days.filter((d) => d.band === 'good').length
  const gap = describeGap(state.following, state.cred)
  // §12: the landlord's line, when rent did something this week.
  const rentLine = rentEventLine(state.lastRentEvent, state.graceWeeksLeft)

  return (
    <div className="summary">
      <h2 className="step-title">Week {state.week} is over</h2>

      <div className="ledger">
        <p className="ledger-row">
          <span>Shifts</span>
          <span className="ledger-in">+£{earned}</span>
        </p>
        {/* Only shown once there's a catalog — a £0 line before you've released
            anything is just noise. */}
        {(state.lastCatalogEarnings > 0 || released(state).length > 0) && (
          <p className="ledger-row">
            <span>Your songs</span>
            <span className="ledger-in">+£{state.lastCatalogEarnings}</span>
          </p>
        )}
        {/* §13: merch, once there's a drop paying (or one that just cost you). */}
        {(state.lastMerchRevenue > 0 || state.merch.length > 0) && (
          <p className="ledger-row">
            <span>Merch</span>
            <span className="ledger-in">+£{state.lastMerchRevenue}</span>
          </p>
        )}
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
          <span className={state.money < 0 ? 'is-broke' : ''}>{formatMoney(state.money)}</span>
        </p>
      </div>

      {/* §12: rent is the game-over factor. When it moves — you slipped, you're
          still behind, you clawed back — the landlord gets the loudest line. */}
      {rentLine && (
        <p className={`rent-notice${state.graceWeeksLeft > 0 ? ' is-overdue' : ' is-clear'}`}>
          {rentLine}
        </p>
      )}

      {/* §4. Following is a figure because the world counts it for you; Cred
          never is, because nobody can tell you what your standing is. */}
      {(state.following > 0 || state.cred > STARTING_CRED + 0.01) && (
        <section className="standing">
          <h3 className="confirm-title">Where you stand</h3>
          {state.following > 0 && (
            <p className="standing-following">
              <strong>{formatFollowing(state.following)}</strong> following
              {state.lastFollowingGain > 0 && (
                <span className="standing-gain"> +{state.lastFollowingGain} this week</span>
              )}
            </p>
          )}
          <p className="standing-cred">{describeCred(state.cred)}</p>
          {gap && <p className="standing-gap">{gap}</p>}
        </section>
      )}

      <GigSummary state={state} />

      {/* §16: the things the week threw at you that weren't on the plan. */}
      {state.eventLog.length > 0 && (
        <section className="week-events">
          {state.eventLog.map((line, i) => (
            <p key={i} className="week-event">
              {line}
            </p>
          ))}
        </section>
      )}

      {/* §14: a face stepped out of the crowd, or one turned on you. */}
      {state.fanNews.length > 0 && (
        <section className="week-events">
          {state.fanNews.map((line, i) => (
            <p key={i} className="week-event">
              {line}
            </p>
          ))}
        </section>
      )}

      {/* §4: a label signed you, recouped, dropped you, or came calling. */}
      {state.labelNews.length > 0 && (
        <section className="week-events">
          {state.labelNews.map((line, i) => (
            <p key={i} className="week-event">
              {line}
            </p>
          ))}
        </section>
      )}

      {/* §13: a run closed with stock still in the box — money you fronted and
          won't get back. The other half of the gamble. */}
      {state.lastDeadStock > 0 && (
        <p className="rent-notice is-overdue">
          A merch run ended with £{state.lastDeadStock} of stock unsold. You ordered more than the
          room wanted.
        </p>
      )}

      {/* §4: a move that read as selling out. */}
      {state.lastBacklash.map((title) => (
        <p key={title} className="backlash">
          Putting out <strong>{title}</strong> did not go unnoticed. The people who had been
          defending you have gone quiet.
        </p>
      ))}

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
