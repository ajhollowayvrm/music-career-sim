import { useState } from 'react'
import { ACTION_ROUTES, routeById } from '../../game/routes.ts'
import {
  BURNOUT_THRESHOLD,
  DAYS,
  burnoutDays,
  isBurntOut,
  plannedActionCount,
  projectEnergy,
} from '../../game/week.ts'
import { activeSong, formatMoney, type LoopAction, type LoopState } from '../../game/loop.ts'
import { formatFollowing } from '../../game/fame.ts'

interface Props {
  state: LoopState
  dispatch: (action: LoopAction) => void
}

/**
 * The planning surface — BRIEF §5.
 *
 * Seven days at once. The projected energy strip under each day is the point of
 * planning a week rather than a day: you can see the wall before you walk into
 * it. It stays a projection, and the board never blocks a bad plan — an
 * exhausting week is a legitimate choice, so this warns and gets out of the way.
 */
export default function WeekBoard({ state, dispatch }: Props) {
  const [openDay, setOpenDay] = useState<number | null>(null)

  // Bars show energy at the END of each day; burnout is judged on the energy a
  // day STARTS with. Two different questions — don't collapse them, or the
  // warning is off by one against what actually resolves.
  const projection = projectEnergy(state.plan, state.energy)
  const doomed = new Set(burnoutDays(state.plan, state.energy))
  const actions = plannedActionCount(state.plan)
  const burnoutCount = doomed.size

  const musicDaysWithNothingToWorkOn = activeSong(state)
    ? 0
    : state.plan.filter((r) => r === 'make_music').length

  return (
    <div className="board">
      <div className="board-head">
        <h2 className="step-title">Week {state.week}</h2>
        <p className="step-lede">
          Lay out your week. Empty days are rest — and rest is a move, not a wasted turn.
        </p>
      </div>

      <ol className="week">
        {DAYS.map((day, i) => {
          const routeId = state.plan[i] ?? null
          const route = routeId ? routeById(routeId) : null
          const energy = projection[i] ?? 0
          // Flagged because you'll START this day with nothing — not because it
          // happens to end low.
          const spent = doomed.has(i)
          const isOpen = openDay === i

          return (
            <li key={day} className={`day${spent ? ' is-spent' : ''}`}>
              <button
                type="button"
                className="day-btn"
                aria-expanded={isOpen}
                onClick={() => setOpenDay(isOpen ? null : i)}
              >
                <span className="day-name">{day}</span>
                <span className={`day-route${route ? '' : ' is-empty'}`}>
                  {route ? route.short : 'Rest'}
                </span>
                <span className="day-energy" aria-hidden="true">
                  <span
                    className={`day-energy-fill${spent ? ' is-spent' : ''}`}
                    style={{ width: `${energy}%` }}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="day-picker">
                  {ACTION_ROUTES.map((r) => {
                    const on = routeId === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className={`pick${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => {
                          dispatch({ type: 'setDay', dayIndex: i, routeId: r.id })
                          setOpenDay(null)
                        }}
                      >
                        <span className="pick-label">{r.label}</span>
                        <span className="pick-cost">{r.energy}</span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className={`pick pick-rest${routeId === null ? ' is-on' : ''}`}
                    onClick={() => {
                      dispatch({ type: 'setDay', dayIndex: i, routeId: null })
                      setOpenDay(null)
                    }}
                  >
                    <span className="pick-label">Rest — do nothing at all</span>
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* A music day with an empty bench is a wasted day (§7). The board warns —
          it doesn't stop you, same as everything else here. */}
      {musicDaysWithNothingToWorkOn > 0 && (
        <p className="board-warn">
          You have {musicDaysWithNothingToWorkOn === 1 ? 'a day' : `${musicDaysWithNothingToWorkOn} days`}{' '}
          down for making music and nothing on the bench. Start a song, or {musicDaysWithNothingToWorkOn === 1 ? 'that day goes' : 'those days go'} nowhere.
        </p>
      )}

      {burnoutCount > 0 ? (
        <p className="board-warn">
          This week runs you into the ground on {burnoutCount} {burnoutCount === 1 ? 'day' : 'days'}.
          You can play it. It will not go well.
        </p>
      ) : (
        <p className="board-note">
          {actions === 0
            ? 'A week of nothing. You will feel better, and the bills still come.'
            : `${actions} ${actions === 1 ? 'day' : 'days'} of work. The rest is rest.`}
        </p>
      )}

      {actions > 0 && (
        <button type="button" className="board-clear" onClick={() => dispatch({ type: 'clearPlan' })}>
          Clear the week
        </button>
      )}

      <p className="board-hint" aria-hidden="true">
        Bars show energy left at the end of each day. Under {BURNOUT_THRESHOLD}% and you are running
        on nothing.
      </p>
    </div>
  )
}

/**
 * The header on every loop screen.
 *
 * Bars, not numbers, for energy and mood (pillar 2). Two figures are shown, and
 * both earn it the same way: the world counts them for you whether you like it
 * or not. Money, because §12 makes it the game-over factor. Following, because
 * §4/§14 make it a real aggregate number and every platform shoves it in your
 * face.
 *
 * Cred is NOT here, on purpose. Nobody can tell you what your standing is; it
 * only ever comes back as prose, on the summary.
 */
export function VitalsBar({ state }: { state: LoopState }) {
  return (
    <div className="vitals">
      <span className="vital">
        <span className="vital-label">Energy</span>
        <span className="vital-track">
          <span
            className={`vital-fill${isBurntOut(state.energy) ? ' is-spent' : ''}`}
            style={{ width: `${state.energy}%` }}
          />
        </span>
      </span>
      <span className="vital">
        <span className="vital-label">Mood</span>
        <span className="vital-track">
          <span className="vital-fill is-mood" style={{ width: `${state.mood}%` }} />
        </span>
      </span>
      <span className="vital-counts">
        <span className={`vital-money${state.money < 0 ? ' is-broke' : ''}`}>
          {formatMoney(state.money)}
        </span>
        <span className="vital-following" title="People following you">
          {formatFollowing(state.following)}
          <span className="vital-following-icon" aria-hidden="true">
            {' '}
            ♪
          </span>
        </span>
      </span>
    </div>
  )
}
