import { useState } from 'react'
import { ACTION_ROUTES, routeById } from '../../game/routes.ts'
import {
  BURNOUT_THRESHOLD,
  DAYS,
  MAX_SLOTS_PER_DAY,
  SLOT_REST_RECOVERY,
  burnoutDays,
  isBurntOut,
  plannedActionCount,
  projectEnergy,
  slotEnergyCost,
} from '../../game/week.ts'
import { activeSong, formatMoney, type LoopAction, type LoopState } from '../../game/loop.ts'
import { formatFollowing } from '../../game/fame.ts'
import { describeRent } from '../../game/finances.ts'
import { describeStrain } from '../../game/events.ts'
import { venueById } from '../../game/venues.ts'

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
    : state.plan.filter((day) => day.includes('make_music')).length

  return (
    <div className="board">
      <div className="board-head">
        <h2 className="step-title">Week {state.week}</h2>
        <p className="step-lede">
          Lay out your week. A day holds up to two things — but a full day still tires you, so you
          can't do everything. Rest is one of those things: take the whole day, or work the morning
          and rest the afternoon. Either way it's a move, not a wasted turn.
        </p>
        {/* §12: overdue rent is a clock the player has to plan around — pick up
            shifts, book a paying room, or sell something (§11). It stays on the
            board until it's cleared, or until it clears you out. */}
        {describeRent(state.graceWeeksLeft) && (
          <p className="rent-notice is-overdue">{describeRent(state.graceWeeksLeft)}</p>
        )}
        {/* §16: the game's honest tap on the shoulder before the chain takes it
            out of your hands. Only shown once it's worth warning about. */}
        {describeStrain(state.strain, state.chain.stage) && (
          <p
            className={`strain-notice${
              state.chain.stage === 'recovering' ? ' is-healing' : ''
            }`}
          >
            {describeStrain(state.strain, state.chain.stage)}
          </p>
        )}
      </div>

      <ol className="week">
        {DAYS.map((day, i) => {
          const daySlots = state.plan[i] ?? []
          const energy = projection[i] ?? 0
          // Flagged because at least one activity that day starts with nothing —
          // not because it happens to end low.
          const spent = doomed.has(i)
          const isOpen = openDay === i
          const dayFull = daySlots.length >= MAX_SLOTS_PER_DAY
          // §9/§5: a booked gig owns its day. It shows here because the whole
          // point of a scheduled commitment is the tension it puts on the days
          // either side of it.
          const gigHere = state.booking?.dayIndex === i ? venueById(state.booking.venueId) : null

          const label = gigHere
            ? `♪ ${gigHere.name}`
            : daySlots.length === 0
              ? 'Rest'
              : daySlots.map((r) => routeById(r).short).join(' + ')

          return (
            <li key={day} className={`day${spent ? ' is-spent' : ''}${gigHere ? ' is-gig' : ''}`}>
              <button
                type="button"
                className="day-btn"
                aria-expanded={isOpen}
                disabled={!!gigHere}
                onClick={() => setOpenDay(isOpen ? null : i)}
              >
                <span className="day-name">{day}</span>
                <span className={`day-route${daySlots.length > 0 || gigHere ? '' : ' is-empty'}`}>
                  {label}
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
                  <p className="day-picker-hint">
                    Up to two things a day — a second one costs you, so a full day still tires you.
                  </p>
                  {daySlots.length > 0 && (
                    <div className="day-slots">
                      {daySlots.map((r, si) => (
                        <button
                          key={si}
                          type="button"
                          className="day-slot-chip"
                          onClick={() => dispatch({ type: 'removeSlot', dayIndex: i, slotIndex: si })}
                        >
                          {routeById(r).short}
                          <span className="day-slot-x" aria-hidden="true">
                            ×
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {ACTION_ROUTES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="pick"
                      disabled={dayFull}
                      onClick={() => dispatch({ type: 'addActivity', dayIndex: i, routeId: r.id })}
                    >
                      <span className="pick-label">{r.label}</span>
                      <span className="pick-cost">{slotEnergyCost(r.id)}</span>
                    </button>
                  ))}
                  {/* §5: rest is a real activity, not only a whole empty day. Take
                      it as one of the two slots to work the morning and rest the
                      afternoon — the slot gives energy back instead of spending it. */}
                  <button
                    type="button"
                    className="pick pick-rest"
                    disabled={dayFull}
                    onClick={() => dispatch({ type: 'addActivity', dayIndex: i, routeId: 'rest' })}
                  >
                    <span className="pick-label">{routeById('rest').label}</span>
                    <span className="pick-cost pick-recover">+{SLOT_REST_RECOVERY}</span>
                  </button>
                  <button
                    type="button"
                    className="pick pick-clear"
                    onClick={() => {
                      dispatch({ type: 'clearDay', dayIndex: i })
                      setOpenDay(null)
                    }}
                  >
                    <span className="pick-label">Clear the day</span>
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
            : `${actions} ${actions === 1 ? 'thing' : 'things'} on this week. Everything else is rest.`}
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
