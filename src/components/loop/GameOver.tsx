import type { Character } from '../../game/character.ts'
import { billedAs } from '../../game/character.ts'
import { released, type LoopState } from '../../game/loop.ts'
import { describeCred, formatFollowing } from '../../game/fame.ts'

interface Props {
  state: LoopState
  character: Character
  onQuit: () => void
}

/**
 * The end of a run — for now, only §12's eviction, the one door you don't
 * choose. §12: "Going broke is only the worst door." The build-dependent
 * endings the player earns — the Scene Legend, the Stadium Star, retiring on
 * your own terms — are §17's, and this screen will grow to host them.
 *
 * It refuses to be a scorecard. What it says back is the shape of the run: how
 * long you lasted, what you managed to put out, and who — if anyone — had
 * decided about you before the money ran out.
 */
export default function GameOver({ state, character, onQuit }: Props) {
  const weeks = state.week
  const out = released(state).length
  const name = billedAs(character)

  return (
    <div className="creation">
      <main className="creation-body">
        <div className="gameover">
          <p className="gameover-eyebrow">The run is over</p>
          <h2 className="gameover-title">Evicted</h2>

          <p className="gameover-lede">
            The month ran out and the rent didn't come together. The locks changed while you were
            out. Your things are in bags by the door, and the guitar is one of them.
          </p>

          <div className="gameover-facts">
            <p>
              <strong>{name}</strong> lasted {weeks} {weeks === 1 ? 'week' : 'weeks'}.
            </p>
            {out > 0 ? (
              <p>
                You put out {out} {out === 1 ? 'song' : 'songs'} that outlast the flat you wrote them
                in.
              </p>
            ) : (
              <p>Nothing you made ever made it out the door.</p>
            )}
            {state.following > 0 && (
              <p>{formatFollowing(state.following)} people were following. None of them made rent.</p>
            )}
            <p className="gameover-cred">{describeCred(state.cred)}</p>
          </div>

          <p className="gameover-coda">
            It isn't the only way this ends. It's just the one nobody chooses.
          </p>

          <div className="resolve-actions">
            <button type="button" className="btn btn-primary btn-grow" onClick={onQuit}>
              Start over
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
