import { useReducer } from 'react'
import type { Character } from '../../game/character.ts'
import { billedAs } from '../../game/character.ts'
import { initialLoopState, loopReducer } from '../../game/loop.ts'
import { canPlayWeek } from '../../game/week.ts'
import WeekBoard, { VitalsBar } from './WeekBoard.tsx'
import DayResolve from './DayResolve.tsx'
import WeekSummary from './WeekSummary.tsx'

interface Props {
  character: Character
  seed: number
  onQuit: () => void
}

/** §5 The Daily Loop: plan a week, watch it happen a day at a time, settle up. */
export default function CareerLoop({ character, seed, onQuit }: Props) {
  const [state, dispatch] = useReducer(loopReducer, seed, initialLoopState)

  return (
    <div className="creation">
      <header className="creation-header">
        <button type="button" className="creation-quit" onClick={onQuit}>
          Leave
        </button>
        <span className="creation-step">{billedAs(character)}</span>
      </header>

      <VitalsBar state={state} />

      <main className="creation-body">
        {state.phase === 'planning' && <WeekBoard state={state} dispatch={dispatch} />}
        {state.phase === 'resolving' && (
          <DayResolve state={state} onNext={() => dispatch({ type: 'advanceDay', character })} />
        )}
        {state.phase === 'summary' && (
          <WeekSummary state={state} onNext={() => dispatch({ type: 'nextWeek' })} />
        )}
      </main>

      {state.phase === 'planning' && (
        <footer className="creation-actions">
          <button
            type="button"
            className="btn btn-primary btn-grow"
            disabled={!canPlayWeek(state.plan)}
            onClick={() => dispatch({ type: 'playWeek' })}
          >
            Play the week
          </button>
        </footer>
      )}
    </div>
  )
}
