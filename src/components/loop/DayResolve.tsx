import { routeById } from '../../game/routes.ts'
import { DAYS } from '../../game/week.ts'
import type { LoopState } from '../../game/loop.ts'
import EventCard from './EventCard.tsx'

interface Props {
  state: LoopState
  onNext: () => void
  onFinish: () => void
  onChoose: (choiceId: string) => void
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
export default function DayResolve({ state, onNext, onFinish, onChoose }: Props) {
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
          const isLatest = d.dayIndex === done - 1
          // A day is now up to two activities — each gets its own line and its
          // own read. Older/gig days carry a single slot, so this covers both.
          return (
            <li
              key={d.dayIndex}
              className={`log-entry${isLatest ? ' is-latest' : ''}${d.burntOut ? ' is-burnt' : ''}`}
            >
              <span className="log-day">{DAYS[d.dayIndex]}</span>
              {d.slots.map((s, si) => (
                <div key={si} className={`log-slot${s.burntOut ? ' is-burnt' : ''}`}>
                  <span className="log-route">{s.routeLabel ?? routeById(s.routeId).short}</span>
                  <p className="log-report">{s.report}</p>
                </div>
              ))}
            </li>
          )
        })}
      </ol>

      {/* §16: the outcomes of events already answered this week, so the day log
          carries the whole story and not just the routes. */}
      {state.eventLog.length > 0 && (
        <ul className="event-log">
          {state.eventLog.map((line, i) => (
            <li key={i} className="event-log-entry">
              {line}
            </li>
          ))}
        </ul>
      )}

      {done === 0 && !state.activeEvent && <p className="step-lede">The week starts.</p>}

      {/* §16: an event owns the turn — no advancing until it's answered. */}
      {state.activeEvent ? (
        <EventCard event={state.activeEvent} onChoose={onChoose} />
      ) : (
        <div className="resolve-actions">
          <button
            type="button"
            className="btn btn-primary btn-grow"
            onClick={allSeen ? onFinish : onNext}
          >
            {allSeen ? 'How the week went' : `Next day — ${DAYS[done]}`}
          </button>
        </div>
      )}

      <p className="sr-only" role="status">
        {current
          ? `${DAYS[current.dayIndex]}: ${current.report}`
          : 'The week is about to start.'}
      </p>
    </div>
  )
}
