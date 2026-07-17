import { useState } from 'react'
import type { Character } from '../../game/character.ts'
import { AGENDA_BLURB, mateSkill, type Bandmate } from '../../game/bandmates.ts'
import {
  describeBandWorth,
  describeMate,
  describeStanding,
  mateChemistry,
} from '../../game/band.ts'
import { formatFollowing } from '../../game/fame.ts'
import type { LoopAction, LoopState } from '../../game/loop.ts'

interface Props {
  state: LoopState
  character: Character
  dispatch: (action: LoopAction) => void
}

/**
 * The band — BRIEF §8.
 *
 * Chemistry is prose, never bars (pillar 2), and that isn't a compromise here —
 * it's the only way the facets read as a person. "Rates you, wouldn't cross the
 * road for you" is a sentence; it is not three progress bars.
 */
export default function BandPanel({ state, character, dispatch }: Props) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const band = state.band

  if (!band) return <NoBand state={state} dispatch={dispatch} naming={naming} setNaming={setNaming} name={name} setName={setName} />

  return (
    <div className="band">
      <div className="board-head">
        <h2 className="step-title">{band.name}</h2>
        <p className="step-lede">
          {band.founded ? 'Your band — or it was, when you started it.' : 'You joined this. It was here before you.'}
        </p>
      </div>

      <p className="standing-cred">{describeStanding(band)}</p>
      {band.members.length > 0 && (
        <p className="leaning-read">{describeBandWorth(character, band)}</p>
      )}

      {state.demand && (
        <div className="demand">
          <p className="demand-text">{state.demand.text}</p>
          <div className="song-actions">
            <button
              type="button"
              className="song-btn is-go"
              onClick={() => dispatch({ type: 'answerDemand', accept: true })}
            >
              Give them it
            </button>
            <button
              type="button"
              className="song-btn"
              onClick={() => dispatch({ type: 'answerDemand', accept: false })}
            >
              No
            </button>
          </div>
        </div>
      )}

      {band.members.length === 0 ? (
        <p className="songs-empty">
          A band of one. Spend a day answering ads and see who turns up.
        </p>
      ) : (
        <>
          <h3 className="songs-head">Who is in it</h3>
          <ul className="song-list">
            {band.members.map((mate) => (
              <li key={mate.id} className="song-card">
                <MateIdentity mate={mate} />
                <p className="song-read">{describeMate(mate, mateChemistry(band, mate.id))}</p>
                <p className="mate-agenda">{mate.name.split(' ')[0]} {AGENDA_BLURB[mate.agenda]}.</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {state.recruits.length > 0 && band.members.length < 4 && (
        <>
          <h3 className="songs-head">Answered your ad</h3>
          <ul className="song-list">
            {state.recruits.map((mate) => (
              <li key={mate.id} className="song-card">
                <MateIdentity mate={mate} />
                <p className="mate-agenda">{mate.name.split(' ')[0]} {AGENDA_BLURB[mate.agenda]}.</p>
                <div className="song-actions">
                  <button
                    type="button"
                    className="song-btn is-go"
                    onClick={() => dispatch({ type: 'recruit', mateId: mate.id })}
                  >
                    Have them in
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {state.bandNews.length > 0 && (
        <ul className="band-news">
          {state.bandNews.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <button type="button" className="board-clear" onClick={() => dispatch({ type: 'leaveBand' })}>
        Leave {band.name}
      </button>
    </div>
  )
}

function MateIdentity({ mate }: { mate: Bandmate }) {
  const skill = mateSkill(mate)
  return (
    <div className="song-identity">
      <p className="song-title">{mate.name}</p>
      <p className="song-meta">
        {mate.roleLabel}
        {/* Their playing is a rough read, not a stat — pillar 2 holds for them too. */}
        <span className="song-themes">
          {' '}
          · {skill >= 0.75 ? 'seriously good' : skill >= 0.45 ? 'solid' : 'still learning'}
        </span>
        {mate.following > 0 && (
          <span className="mate-following"> · brings {formatFollowing(mate.following)}</span>
        )}
      </p>
    </div>
  )
}

interface NoBandProps {
  state: LoopState
  dispatch: (action: LoopAction) => void
  naming: boolean
  setNaming: (v: boolean) => void
  name: string
  setName: (v: string) => void
}

/**
 * §8's fork: found one and start with pull, or join one and start with nothing.
 * Both are real roads — founding buys you the say, joining buys you a band that
 * already exists.
 */
function NoBand({ state, dispatch, naming, setNaming, name, setName }: NoBandProps) {
  return (
    <div className="band">
      <div className="board-head">
        <h2 className="step-title">No band</h2>
        <p className="step-lede">
          You can start one and have the say from day one, or answer an ad and walk into a room that
          was doing fine without you.
        </p>
      </div>

      {naming ? (
        <div className="song-form">
          <label className="field">
            <span className="field-label">Call it</span>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Every band needs a name"
              maxLength={40}
              autoCapitalize="words"
            />
          </label>
          <div className="song-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setNaming(false)}>
              Never mind
            </button>
            <button
              type="button"
              className="btn btn-primary btn-grow"
              disabled={!name.trim()}
              onClick={() => {
                dispatch({ type: 'foundBand', name })
                setNaming(false)
              }}
            >
              {name.trim() ? 'Start it' : 'Give it a name'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setNaming(true)}>
          Start a band
        </button>
      )}

      {state.bandOffers.length > 0 && (
        <>
          <h3 className="songs-head">Bands who would have you</h3>
          <ul className="song-list">
            {state.bandOffers.map((offer) => (
              <li key={offer.id} className="song-card">
                <p className="song-title">{offer.name}</p>
                <p className="song-meta">
                  {offer.members.map((m) => m.roleLabel).join(', ')}
                </p>
                <ul className="offer-members">
                  {offer.members.map((m) => (
                    <li key={m.id}>
                      {m.name} — {m.roleLabel}, {AGENDA_BLURB[m.agenda]}
                    </li>
                  ))}
                </ul>
                <p className="song-read">
                  You would be the new one. Nothing in that room is yours yet.
                </p>
                <div className="song-actions">
                  <button
                    type="button"
                    className="song-btn is-go"
                    onClick={() => dispatch({ type: 'joinBand', offerId: offer.id })}
                  >
                    Join {offer.name}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {state.bandOffers.length === 0 && (
        <p className="songs-empty">
          Nobody is asking. Spend a day answering ads and see what comes back.
        </p>
      )}

      {state.bandNews.length > 0 && (
        <ul className="band-news">
          {state.bandNews.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
