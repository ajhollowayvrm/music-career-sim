import type { Character } from '../../game/character.ts'
import {
  CROWD_MAX,
  GIG_EVENTS,
  allowsCovers,
  choicesFor,
  isCover,
  playableSongs,
  songIntensity,
} from '../../game/gig.ts'
import { venueById } from '../../game/venues.ts'
import { formatFollowing } from '../../game/fame.ts'
import type { LoopAction, LoopState } from '../../game/loop.ts'

interface Props {
  state: LoopState
  character: Character
  dispatch: (action: LoopAction) => void
}

/**
 * The gig — BRIEF §9's two acts, in order: the strategist, then the performer.
 *
 * Nothing here shows the crowd as a number. The meter is a bar and the beats are
 * prose, because pillar 2 holds on stage too — you can feel a room, you can't
 * read it off a display.
 */
export default function GigNight({ state, character, dispatch }: Props) {
  const gig = state.gig
  if (!gig) return null
  const venue = venueById(gig.venueId)

  if (gig.stage === 'setlist') return <Setlist state={state} dispatch={dispatch} />

  return (
    <div className="gig">
      <header className="gig-head">
        <p className="eyebrow">{venue.name}</p>
        <CrowdMeter crowd={gig.crowd} />
      </header>

      <ol className="gig-beats">
        {gig.beats.map((beat, i) => (
          <li
            key={i}
            className={`beat is-${beat.kind}${beat.personaBreak ? ` is-${beat.personaBreak}` : ''}`}
          >
            {beat.text}
          </li>
        ))}
      </ol>

      {gig.stage === 'result' ? (
        <div className="resolve-actions">
          <button
            type="button"
            className="btn btn-primary btn-grow"
            onClick={() => dispatch({ type: 'finishGig' })}
          >
            Get off stage
          </button>
        </div>
      ) : gig.event ? (
        <Event eventId={gig.event} dispatch={dispatch} />
      ) : gig.awaitingSong ? (
        <div className="resolve-actions">
          <button
            type="button"
            className="btn btn-primary btn-grow"
            onClick={() => dispatch({ type: 'playNextSong', character })}
          >
            Play {songTitle(state, gig.setlist[gig.played])}
          </button>
        </div>
      ) : (
        <Choices state={state} dispatch={dispatch} />
      )}
    </div>
  )
}

const songTitle = (state: LoopState, id: number | undefined): string => {
  if (id !== undefined && isCover(id)) return 'a cover'
  return state.songs.find((s) => s.id === id)?.title ?? 'the next one'
}

/** A bar, never a number — you feel a room, you don't read it. */
function CrowdMeter({ crowd }: { crowd: number }) {
  const pct = (crowd / CROWD_MAX) * 100
  return (
    <div className="crowd">
      <span className="crowd-label">The room</span>
      <span className="crowd-track">
        <span
          className={`crowd-fill${crowd < 30 ? ' is-cold' : crowd > 72 ? ' is-hot' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Act one: the strategist                                                    */
/* -------------------------------------------------------------------------- */

function Setlist({ state, dispatch }: { state: LoopState; dispatch: (a: LoopAction) => void }) {
  const gig = state.gig!
  const venue = venueById(gig.venueId)
  const available = playableSongs(state.songs)
  const full = gig.setlist.length >= venue.slots
  const canCover = allowsCovers(venue)

  return (
    <div className="gig">
      <div className="board-head">
        <h2 className="step-title">{venue.name}</h2>
        <p className="step-lede">{venue.blurb}</p>
      </div>

      <h3 className="songs-head">
        The set — {gig.setlist.length}/{venue.slots}
      </h3>

      {gig.setlist.length === 0 ? (
        <p className="songs-empty">
          Nothing picked yet. Where the loud ones go, where they breathe, how you close — that is the
          gig, as much as the songs are.
        </p>
      ) : (
        <ol className="setlist">
          {gig.setlist.map((id, i) => {
            const song = isCover(id) ? null : state.songs.find((s) => s.id === id)
            const loud = song ? songIntensity(song) >= 0.5 : false
            return (
              <li key={`${id}-${i}`} className="setlist-item">
                <span className="setlist-n">{i + 1}</span>
                <span className="setlist-title">{song ? song.title : 'A cover'}</span>
                <span
                  className={`setlist-tag${song ? (loud ? ' is-loud' : ' is-quiet') : ' is-cover'}`}
                >
                  {song ? (loud ? 'loud' : 'quiet') : 'cover'}
                </span>
                <button
                  type="button"
                  className="setlist-drop"
                  aria-label={`Take ${song ? song.title : 'the cover'} out of the set`}
                  onClick={() => dispatch({ type: 'removeFromSet', index: i })}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <h3 className="songs-head">What you can play</h3>
      <ul className="genres">
        {available.map((song) => {
          const on = gig.setlist.includes(song.id)
          const loud = songIntensity(song) >= 0.5
          return (
            <li key={song.id}>
              <button
                type="button"
                className={`genre${on ? ' is-on' : ''}`}
                disabled={!on && full}
                onClick={() => dispatch({ type: 'toggleSetlistSong', songId: song.id })}
              >
                {song.title}
                {/* Its own class: .pick-cost carries a ' energy' ::after from the
                    week board, which reads as "Rent Day ▲ energy" here. */}
                <span className="song-intensity"> {loud ? '▲' : '▽'}</span>
              </button>
            </li>
          )
        })}
        {canCover && (
          <li>
            <button
              type="button"
              className="genre is-cover-add"
              disabled={full}
              onClick={() => dispatch({ type: 'addCover' })}
            >
              + A cover
            </button>
          </li>
        )}
      </ul>
      <p className="board-hint" aria-hidden="true">
        ▲ loud · ▽ quiet · tap to add — they play in the order you add them
        {canCover && ' · covers fill the gaps but win you no cred'}
      </p>

      <div className="resolve-actions">
        <button
          type="button"
          className="btn btn-primary btn-grow"
          disabled={!full}
          onClick={() => dispatch({ type: 'startPerformance' })}
        >
          {full ? 'Go on' : `Fill the set — ${gig.setlist.length}/${venue.slots}`}
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Act two: the performer                                                     */
/* -------------------------------------------------------------------------- */

function Choices({ state, dispatch }: { state: LoopState; dispatch: (a: LoopAction) => void }) {
  const venue = venueById(state.gig!.venueId)
  return (
    <div className="gig-choices">
      <p className="gig-prompt">Between songs.</p>
      <ul className="answers">
        {choicesFor(venue).map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              className="answer"
              onClick={() => dispatch({ type: 'gigChoose', choiceId: choice.id })}
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Event({ eventId, dispatch }: { eventId: keyof typeof GIG_EVENTS; dispatch: (a: LoopAction) => void }) {
  const event = GIG_EVENTS[eventId]
  return (
    <div className="gig-choices">
      <p className="gig-event">{event.text}</p>
      <ul className="answers">
        {event.handlings.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              className="answer"
              onClick={() => dispatch({ type: 'gigHandle', handlingId: h.id })}
            >
              {h.label}
              {h.cost ? <span className="handling-cost"> costs £{h.cost}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shown on the week summary after a gig night. */
export function GigSummary({ state }: { state: LoopState }) {
  const last = state.lastGig
  if (!last) return null
  return (
    <section className="standing">
      <h3 className="confirm-title">{last.venueName}</h3>
      <p className="standing-cred">{last.result.read}</p>
      <p className="standing-following">
        <span className="standing-gain">
          +{formatFollowing(last.result.followingGain)} following
        </span>
      </p>
    </section>
  )
}
