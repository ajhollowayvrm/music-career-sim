import { routeById } from '../../game/routes.ts'
import { DAYS } from '../../game/week.ts'
import type { LoopState } from '../../game/loop.ts'

interface Props {
  state: LoopState
  onNext: () => void
  onFinish: () => void
}

/**
 * The week happening, a day at a time — BRIEF §5.
 *
 * This is why the clock stays daily. Days land one by one, in order, so a choice
 * can still cost you tomorrow, and so §16's events have somewhere to interrupt
 * from when they arrive.
 *
 * The reports are the only thing the player gets. No quality number, no deltas —
 * pillar 2. What's on screen is what happened and how this particular person
 * read it (§3's perception filter, see resolve.ts).
 */
export default function DayResolve({ state, onNext, onFinish }: Props) {
  const done = state.days.length
  const current = state.days[done - 1]
  const remaining = DAYS.length - done
  // All seven are on screen and read before the week closes.
  const allSeen = remaining === 0

  return (
    <div className="resolve">
      <h2 className="step-title">Week {state.week}</h2>

      <ol className="day-log">
        {state.days.map((d) => {
          const route = routeById(d.routeId)
          const isLatest = d.dayIndex === done - 1
          return (
            <li
              key={d.dayIndex}
              className={`log-entry${isLatest ? ' is-latest' : ''}${d.burntOut ? ' is-burnt' : ''}`}
            >
              <span className="log-day">{DAYS[d.dayIndex]}</span>
              <span className="log-route">{route.short}</span>
              <p className="log-report">{d.report}</p>
            </li>
          )
        })}
      </ol>

      {done === 0 && <p className="step-lede">The week starts.</p>}

      <div className="resolve-actions">
        <button
          type="button"
          className="btn btn-primary btn-grow"
          onClick={allSeen ? onFinish : onNext}
        >
          {allSeen ? 'How the week went' : `Next day — ${DAYS[done]}`}
        </button>
      </div>

      <p className="sr-only" role="status">
        {current
          ? `${DAYS[current.dayIndex]}: ${current.report}`
          : 'The week is about to start.'}
      </p>
    </div>
  )
}
