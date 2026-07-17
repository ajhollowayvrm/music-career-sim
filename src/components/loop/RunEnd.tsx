import type { Character } from '../../game/character.ts'
import { billedAs } from '../../game/character.ts'
import { released, type LoopState } from '../../game/loop.ts'
import { ageForWeek } from '../../game/career.ts'
import { describeCred, formatFollowing } from '../../game/fame.ts'

interface Props {
  state: LoopState
  character: Character
  onQuit: () => void
}

/**
 * The end of a run you reached, not the one that reached you — BRIEF §17. The
 * ending is build-dependent and it never scores you: it says the run back to
 * you, in its own terms. Retiring a Scene Legend and retiring a Stadium Star are
 * different endings to different games, and that's the whole point of §1's
 * multiple win conditions.
 */
export default function RunEnd({ state, character, onQuit }: Props) {
  const ending = state.ending
  if (!ending) return null
  const name = billedAs({ realName: character.realName, stageName: state.stageName ?? character.stageName })
  const age = ageForWeek(state.week)

  return (
    <div className="creation">
      <main className="creation-body">
        <div className="gameover">
          <p className="gameover-eyebrow">The run is over</p>
          <h2 className="gameover-title is-ending">{ending.title}</h2>

          <p className="gameover-lede">{ending.prose}</p>

          <div className="gameover-facts">
            <p>
              <strong>{name}</strong>, {age}, after {state.week}{' '}
              {state.week === 1 ? 'week' : 'weeks'} in it.
            </p>
            <p>
              {released(state).length} {released(state).length === 1 ? 'release' : 'releases'}
              {state.awardsWon > 0 && `, ${state.awardsWon} ${state.awardsWon === 1 ? 'award' : 'awards'}`}
              {state.following > 0 && `, ${formatFollowing(state.following)} following`}.
            </p>
            <p className="gameover-cred">{describeCred(state.cred)}</p>
          </div>

          <div className="resolve-actions">
            <button type="button" className="btn btn-primary btn-grow" onClick={onQuit}>
              Start another
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
