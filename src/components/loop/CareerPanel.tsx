import { useState } from 'react'
import type { Character } from '../../game/character.ts'
import { billedAs } from '../../game/character.ts'
import { released, type LoopAction, type LoopState } from '../../game/loop.ts'
import { ageForWeek, milestones, rebrandCost } from '../../game/career.ts'

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
    </div>
  )
}
