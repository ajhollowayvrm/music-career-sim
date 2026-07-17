import { VENUES, canPlay, whyLocked } from '../../game/venues.ts'
import { playableSongs } from '../../game/gig.ts'
import { DAYS } from '../../game/week.ts'
import { formatFollowing } from '../../game/fame.ts'
import type { LoopAction, LoopState } from '../../game/loop.ts'

interface Props {
  state: LoopState
  dispatch: (action: LoopAction) => void
}

/**
 * Booking — BRIEF §9, gated by §4.
 *
 * §4 promised Following "unlocks auditions, bookings". This is the door it
 * unlocks. Locked rooms are shown, not hidden: the ladder is the point, and a
 * room you can't get into yet is more motivating than a room you can't see.
 */
export default function GigsPanel({ state, dispatch }: Props) {
  const canGig = playableSongs(state.songs).length > 0
  const booked = state.booking

  return (
    <div className="gigs">
      <div className="board-head">
        <h2 className="step-title">Rooms</h2>
        <p className="step-lede">
          One night a week. The room takes the day — and how you spend the days either side decides
          whether you turn up sharp or wrecked.
        </p>
      </div>

      {!canGig && (
        <p className="board-warn">
          You have nothing to play. Finish writing something first — nobody books an act with no
          songs.
        </p>
      )}

      {booked && (
        <div className="booked">
          <p className="booked-line">
            Booked: <strong>{VENUES.find((v) => v.id === booked.venueId)?.name}</strong>,{' '}
            {DAYS[booked.dayIndex]}
          </p>
          <button
            type="button"
            className="song-btn is-drop"
            onClick={() => dispatch({ type: 'cancelBooking' })}
          >
            Pull out
          </button>
        </div>
      )}

      <ul className="venues">
        {VENUES.map((venue) => {
          const open = canPlay(venue, state.following, state.cred)
          const locked = whyLocked(venue, state.following, state.cred)
          const isBooked = booked?.venueId === venue.id

          return (
            <li key={venue.id} className={`venue${open ? '' : ' is-locked'}${isBooked ? ' is-booked' : ''}`}>
              <p className="venue-name">{venue.name}</p>
              <p className="venue-blurb">{venue.blurb}</p>
              <p className="venue-facts">
                {venue.capacity} capacity · {venue.slots} songs
                {venue.pay > 0 ? ` · £${venue.pay}` : ' · no fee'}
              </p>

              {locked ? (
                <p className="venue-locked">
                  {locked}
                  <span className="venue-needs">
                    {venue.minFollowing > 0 && ` Wants ${formatFollowing(venue.minFollowing)} following.`}
                  </span>
                </p>
              ) : (
                <div className="venue-days">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      className={`venue-day${isBooked && booked?.dayIndex === i ? ' is-on' : ''}`}
                      disabled={!canGig}
                      onClick={() => dispatch({ type: 'bookGig', venueId: venue.id, dayIndex: i })}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
