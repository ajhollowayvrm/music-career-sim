import { useEffect, useState } from 'react'
import type { Character } from '../../game/character.ts'
import { billedAs } from '../../game/character.ts'
import { released, type LoopAction, type LoopState } from '../../game/loop.ts'
import { ageForWeek, milestones, rebrandCost } from '../../game/career.ts'
import {
  SYNC_EVENT,
  cloudConfigured,
  formatCode,
  getCode,
  getSyncStatus,
  type SyncStatus,
} from '../../game/cloudSave.ts'

interface Props {
  state: LoopState
  character: Character
  dispatch: (action: LoopAction) => void
}

/**
 * The macro ladder, made visible — BRIEF §17. The arc you can only see from a
 * distance: how old you are, the rungs you've climbed and the ones still above
 * you, the outward name you can reinvent, and the one door you choose — retiring
 * on your own terms, into whichever ending your run has earned.
 */
export default function CareerPanel({ state, character, dispatch }: Props) {
  const [newName, setNewName] = useState('')
  const [confirmRetire, setConfirmRetire] = useState(false)

  const name = billedAs({ realName: character.realName, stageName: state.stageName ?? character.stageName })
  const age = ageForWeek(state.week)
  const rungs = milestones({
    following: state.following,
    cred: state.cred,
    releasedSongs: released(state).length,
    hasBand: !!state.band,
    awardsWon: state.awardsWon,
    recovered: state.chain.recovered,
    playedGig: state.everPlayedGig,
  })
  const cost = rebrandCost(state.following)

  return (
    <div className="career">
      <div className="board-head">
        <h2 className="step-title">The career</h2>
        <p className="step-lede">
          {name}, {age}. Week {state.week}.
        </p>
      </div>

      <section className="career-section">
        <h3 className="items-heading">The climb</h3>
        <ul className="rungs">
          {rungs.map((m, i) => (
            <li key={i} className={`rung${m.reached ? ' is-reached' : ''}`}>
              <span className="rung-mark" aria-hidden="true">
                {m.reached ? '●' : '○'}
              </span>
              {m.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="career-section">
        <h3 className="items-heading">Rebrand</h3>
        <p className="items-subhead">
          A new name and a new face — the outward you, not the inner one.{' '}
          {cost > 0
            ? `At your size it costs you recognition: about ${cost} following.`
            : "Nobody knows the old name well enough for it to cost you anything yet."}
        </p>
        <label className="field">
          <input
            className="input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="A new stage name"
            autoCapitalize="words"
            maxLength={40}
          />
        </label>
        <button
          type="button"
          className="song-btn"
          disabled={!newName.trim() || newName.trim() === name}
          onClick={() => {
            dispatch({ type: 'rebrand', newName })
            setNewName('')
          }}
        >
          Become {newName.trim() || '…'}
        </button>
      </section>

      <section className="career-section">
        <h3 className="items-heading">Retire</h3>
        <p className="items-subhead">
          You can walk away whenever you like, into whatever ending the run has earned. It is the one
          door you choose.
        </p>
        {confirmRetire ? (
          <div className="retire-confirm">
            <p>Call it a career?</p>
            <div className="item-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmRetire(false)}>
                Not yet
              </button>
              <button
                type="button"
                className="btn btn-primary btn-grow"
                onClick={() => dispatch({ type: 'retire' })}
              >
                Retire
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="song-btn is-drop" onClick={() => setConfirmRetire(true)}>
            Retire
          </button>
        )}
      </section>

      {cloudConfigured() && <CloudStatus />}
    </div>
  )
}

/** The recovery code and live sync state, in-run (see cloudSave.ts). */
function CloudStatus() {
  const code = getCode()
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  useEffect(() => {
    const on = (e: Event) => setStatus((e as CustomEvent<SyncStatus>).detail)
    window.addEventListener(SYNC_EVENT, on)
    return () => window.removeEventListener(SYNC_EVENT, on)
  }, [])

  const label: Record<SyncStatus['state'], string> = {
    idle: 'Cloud save ready',
    syncing: 'Saving to the cloud…',
    ok: 'Saved to the cloud',
    offline: 'Offline — saved on this device',
    error: status.message ?? 'Sync error',
    conflict: 'This run changed on another device',
  }

  return (
    <section className="career-section">
      <h3 className="items-heading">Cloud save</h3>
      <p className="cloud-status">
        <span className={`cloud-dot is-${status.state}`} aria-hidden="true" />
        {label[status.state]}
      </p>
      {code && (
        <>
          <p className="cloud-code-line">
            <span className="cloud-label">Recovery code</span>
            <code className="cloud-code">{formatCode(code)}</code>
          </p>
          <p className="cloud-hint">
            Back this up. It's the only way to reach this save on another device or after your browser
            clears its storage.
          </p>
        </>
      )}
    </section>
  )
}
